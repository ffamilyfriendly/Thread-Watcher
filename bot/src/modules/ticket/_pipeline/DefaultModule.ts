import { PipelineModule, SelectionStart, TicketPanel } from '@watcher/shared';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ColorResolvable,
  ComponentEmojiResolvable,
  EmbedBuilder,
  EmojiResolvable,
  Guild,
  Interaction,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
  User,
} from 'discord.js';
import { err, ok, Result } from 'neverthrow';
import { Logger } from 'tslog';
import { component_service } from '@providers/services/component_service';
import { map_err } from 'utilities/error';
import { safe_reply_or_followup } from './helpers/safe_reply';
import { config } from '@providers/config';
import { ValidPropertyReturn, ValueContainer } from './ValueContainter';

namespace Op {
  export function and(v: boolean[]): boolean {
    return v.every(Boolean);
  }

  export function or(v: boolean[]): boolean {
    return !!v.find((v) => v);
  }

  export function starts_with(v1: ValidPropertyReturn, v2: ValidPropertyReturn): boolean {
    if (!v2) return false;

    if (typeof v1 === 'string') {
      let v2_string = Array.isArray(v2) ? v2.join(',') : v2.toString();
      return v1.startsWith(v2_string);
    }

    return v1?.toString().startsWith(v2.toString()) ?? false;
  }

  export function ends_with(v1: ValidPropertyReturn, v2: ValidPropertyReturn): boolean {
    if (!v2) return false;

    if (typeof v1 === 'string') {
      let v2_string = Array.isArray(v2) ? v2.join(',') : v2.toString();
      return v1.endsWith(v2_string);
    }

    return v1?.toString().endsWith(v2.toString()) ?? false;
  }

  export function not_null(v1: ValidPropertyReturn): boolean {
    return !!v1;
  }

  export function includes(v1: ValidPropertyReturn, v2: ValidPropertyReturn): boolean {
    if (typeof v2 !== 'string') return false;
    if (!v1) return false;
    if (typeof v1 === 'number') return false;

    return v1.includes(v2);
  }

  export function eq(v1: ValidPropertyReturn, v2: ValidPropertyReturn): boolean {
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

  async ensure_fresh_interaction(
    interaction: Interaction,
    display_overides?: {
      proceed_button_text?: string;
      proceed_button_style?: ButtonStyle;
      proceed_button_emoji?: ComponentEmojiResolvable;
      embed_title?: string;
      embed_description?: string;
      embed_colour?: ColorResolvable;
    },
  ): Promise<Result<SupportedInteractionType, Error>> {
    if (interaction.isAutocomplete())
      return err(
        new Error(
          'AutoComplete interaction handed to module (this should never happen, good job if you managed it)',
        ),
      );

    const is_valid_supported_interaction_type =
      interaction.isButton() || interaction.isStringSelectMenu();
    const is_fresh_interation = !interaction.replied && !interaction.deferred;

    if (is_valid_supported_interaction_type && is_fresh_interation) {
      return ok(interaction);
    }

    const action_row = new ActionRowBuilder<ButtonBuilder>();
    const button = new ButtonBuilder();
    button.setStyle(display_overides?.proceed_button_style ?? ButtonStyle.Primary);
    button.setLabel(display_overides?.proceed_button_text ?? 'Proceed');
    if (display_overides?.proceed_button_emoji)
      button.setEmoji(display_overides.proceed_button_emoji);

    const btn_promise = component_service.wait_for_interaction(
      button,
      (int) => int.user.id === interaction.user.id,
    );
    action_row.addComponents(button);

    const embed = new EmbedBuilder();
    embed.setTitle(display_overides?.embed_title ?? 'Please press button');
    embed.setColor(display_overides?.embed_colour ?? (config.style.info.colour as ColorResolvable));
    if (display_overides?.embed_description)
      embed.setDescription(display_overides.embed_description);

    const could_send_reply = await safe_reply_or_followup(interaction, {
      embeds: [embed],
      components: [action_row],
      flags: 'Ephemeral',
    });
    if (could_send_reply.isErr()) {
      this.l.error('could not prompt user input', could_send_reply.error);
      return err(could_send_reply.error);
    }

    const reply_results = await btn_promise;
    if (reply_results.isErr()) return err(map_err(reply_results.error));

    return ok(reply_results.value);
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
  logger: Logger<unknown>;
  exports: ValueContainer;

  get_property(id: string): ValidPropertyReturn;
}
