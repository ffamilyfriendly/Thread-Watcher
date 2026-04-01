import { MODULE_OUTPUTS, PipelineModule, TicketPanel } from '@watcher/shared';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  EmbedBuilder,
  Guild,
  Interaction,
  Message,
  ModalBuilder,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
  ThreadChannel,
} from 'discord.js';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { Logger } from 'tslog';
import { component_service } from '@providers/services/component_service';
import { map_err } from 'utilities/error';
import { safe_reply_or_followup, safe_update } from 'utilities/interaction_helpers';
import { ValueContainer } from './ValueContainter';
import { ContractLeafValue } from '@watcher/shared/tickets/contracts';
import { get_default_embed, get_default_proceed, get_default_skip } from './components/modal_cta';
import { Vacuum } from 'services/ComponentService';

namespace Op {
  export function and(v: boolean[]): boolean {
    return v.every(Boolean);
  }

  export function or(v: boolean[]): boolean {
    return !!v.find((v) => v);
  }

  export function starts_with(v1: ContractLeafValue, v2: ContractLeafValue): boolean {
    if (!v2) return false;

    if (typeof v1 === 'string') {
      let v2_string = Array.isArray(v2) ? v2.join(',') : v2.toString();
      return v1.startsWith(v2_string);
    }

    return v1?.toString().startsWith(v2.toString()) ?? false;
  }

  export function ends_with(v1: ContractLeafValue, v2: ContractLeafValue): boolean {
    if (!v2) return false;

    if (typeof v1 === 'string') {
      let v2_string = Array.isArray(v2) ? v2.join(',') : v2.toString();
      return v1.endsWith(v2_string);
    }

    return v1?.toString().endsWith(v2.toString()) ?? false;
  }

  export function not_null(v1: ContractLeafValue): boolean {
    return !!v1;
  }

  export function includes(v1: ContractLeafValue, v2: ContractLeafValue): boolean {
    if (typeof v2 !== 'string') return false;
    if (typeof v1 === 'boolean') return false;
    if (typeof v1 === 'number') return false;
    if (v1 === null) return false;

    return v1.includes(v2);
  }

  export function eq(v1: ContractLeafValue, v2: ContractLeafValue): boolean {
    return v1 == v2;
  }
}

export type SupportedInteractionType = ButtonInteraction | StringSelectMenuInteraction;
export type SupportedInteractionTypeWithGuild = SupportedInteractionType & {
  guildId: string;
  guild: Guild;
};

export abstract class DefaultModule<TModType extends PipelineModule> {
  protected l: Logger<unknown>;

  constructor(
    protected self: TModType,
    protected pipeline: IPipeline,
    readonly exports: ValueContainer,
  ) {
    this.l = pipeline.logger.getSubLogger({ name: `[${self.type}] ${self.id}` });
  }

  get id() {
    return this.self.id;
  }

  private get_conditional_value(v?: string | null) {
    if (!v) return null;
    if (!v.startsWith('{{') || !v.endsWith('}}')) return v;
    const variable_name = v.substring(2, v.length - 2);
    return this.pipeline.get_property(variable_name);
  }

  satisfies_conditionals(): boolean {
    let bools: boolean[] = [];

    for (const conditional of this.self.conditionals) {
      const val_1 = this.get_conditional_value(conditional.value_1);
      const val_2 = this.get_conditional_value(conditional.value_2);

      let bool_val;
      switch (conditional.operand) {
        case 'starts_with':
          bool_val = Op.starts_with(val_1, val_2);
          break;
        case 'ends_with':
          bool_val = Op.ends_with(val_1, val_2);
          break;
        case 'not_null':
          bool_val = Op.not_null(val_1);
          break;
        case 'includes':
          bool_val = Op.includes(val_1, val_2);
          break;
        case 'equal':
          bool_val = Op.eq(val_1, val_2);
      }
      this.l.silly(`${val_1} ${conditional.operand} ${val_2} = ${bool_val}`);
      bools.push(bool_val);
    }

    return this.self.conditional_type === 'AND' ? Op.and(bools) : Op.or(bools);
  }

  async ensure_modal_shown(
    interaction: Interaction,
    modal: ModalBuilder,
    options?: {
      proceed_button?: ButtonBuilder;
      skip_button?: ButtonBuilder | false;
      embed?: EmbedBuilder;
      use_update_instead?: boolean;
    },
  ): Promise<Result<ModalSubmitInteraction | ButtonInteraction, Error>> {
    if (interaction.isAutocomplete())
      return err(
        new Error(
          'AutoComplete interaction handed to module (this should never happen, good job if you managed it)',
        ),
      );

    const embed = options?.embed ?? get_default_embed();
    const proceed_btn = options?.proceed_button ?? get_default_proceed();
    const skip_btn =
      options?.skip_button === false ? null : (options?.skip_button ?? get_default_skip());

    const btn_row = new ActionRowBuilder<ButtonBuilder>();
    btn_row.addComponents(proceed_btn);
    if (skip_btn) btn_row.addComponents(skip_btn);

    const component_vacuum = new Vacuum();

    const filter = (int: Interaction) => int.user.id === interaction.user.id;

    return new Promise(async (resolve) => {
      const on_timeout = () => resolve(err(new Error('timed out')));

      component_vacuum.add(
        component_service.wait_for_interaction_callback(
          proceed_btn,
          filter,
          async (btn_int) => {
            const could_show_modal = await ResultAsync.fromPromise(
              btn_int.showModal(modal),
              map_err,
            );
            if (could_show_modal.isErr()) {
              component_vacuum.clean();
              return resolve(err(could_show_modal.error));
            }
          },
          undefined,
          on_timeout,
        ),
        component_service.wait_for_interaction_callback(
          modal,
          filter,
          (modal_int) => {
            component_vacuum.clean();
            return resolve(ok(modal_int));
          },
          undefined,
          on_timeout,
        ),
      );

      if (skip_btn)
        component_vacuum.add(
          component_service.wait_for_interaction_callback(
            skip_btn,
            filter,
            (btn_int) => {
              component_vacuum.clean();
              return resolve(ok(btn_int));
            },
            undefined,
            on_timeout,
          ),
        );

      let promise: Result<unknown, Error>;

      if (options?.use_update_instead) {
        promise = await safe_update(interaction, { components: [btn_row], embeds: [embed] });
      } else {
        promise = await safe_reply_or_followup(interaction, {
          components: [btn_row],
          embeds: [embed],
          flags: 'Ephemeral',
        });
      }
      if (promise.isErr()) {
        component_vacuum.clean();
        return resolve(err(promise.error));
      }
    });
  }

  public get_themed_embed(configure_embed?: (e: EmbedBuilder) => void): EmbedBuilder {
    const module_meta = MODULE_OUTPUTS[this.self.type];
    const e = new EmbedBuilder();
    e.setColor(module_meta.accent_clr);
    configure_embed?.(e);
    return e;
  }

  protected abstract run(
    interaction: SupportedInteractionTypeWithGuild,
  ): Promise<Result<SupportedInteractionTypeWithGuild | void, Error>>;

  async run_module(interaction: SupportedInteractionTypeWithGuild) {
    const is_satisfied = this.satisfies_conditionals();

    this.l.silly(`Conditionals satisfied: ${is_satisfied}`);
    if (!is_satisfied) return ok();

    this.exports.activate();

    const result = await this.run(interaction);

    if (result.isErr()) {
      this.l.error(`Ran into a fatal error`, result.error);
    }

    return result;
  }
}

export interface IPipeline {
  assigned_roles: string[];
  assigned_channel: string;
  readonly ticket_name: string;
  name: string;
  logger: Logger<unknown>;
  ticket_id: string;
  exports: ValueContainer;
  readonly data: TicketPanel;

  get_property(id: string): ContractLeafValue;
  start_ticket_silently(): void;
  start_ticket_with_thread(
    int: SupportedInteractionType,
    ticket_thread: ThreadChannel,
    start_message: Message,
  ): Promise<Result<unknown, Error>>;
}
