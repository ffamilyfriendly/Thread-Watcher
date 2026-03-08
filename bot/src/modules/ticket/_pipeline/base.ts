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
import { Pipeline } from './state';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { Logger } from 'tslog';
import { component_service } from '@providers/services/component_service';
import { map_err } from 'utilities/error';
import { safe_reply } from './safe_reply';
import { config } from '@providers/config';

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

type ValueContainerValue = ValidPropertyReturn | (() => ValidPropertyReturn) | ValueContainer;

type MappedProps = Record<string, ValidPropertyReturn | Record<string, unknown>>;

export class ValueContainer {
  is_activated = true;
  constructor(
    public exports: Record<string, ValueContainerValue>,
    private default_value: ValidPropertyReturn,
  ) {}

  activate() {
    this.is_activated = true;
  }

  set(key: string, value: ValueContainerValue) {
    this.exports[key] = value;
  }

  get(keys: string[]): ValidPropertyReturn {
    if (!this.is_activated) return null;
    const key = keys.shift();
    if (!key) return null;

    const value = this.exports[key];

    if (value instanceof ValueContainer) {
      if (keys.length === 0) return this.default_value;
      return value.get(keys);
    }

    if (typeof value === 'function') return value();

    return value;
  }

  all(): MappedProps {
    if (!this.is_activated) return {};
    const rv: MappedProps = {};

    for (const [name, value] of Object.entries(this.exports)) {
      if (value instanceof ValueContainer) {
        if (value.is_activated) rv[name] = value.all();
      } else if (typeof value === 'function') {
        rv[name] = value();
      } else {
        rv[name] = value;
      }
    }

    return rv;
  }

  static value_into_string(value: ValidPropertyReturn, variable_name?: 'Unknown'): string {
    if (!value) return `\`? ${variable_name} ?\``;
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'number') return value.toString();
    return value;
  }

  static string_into_args(str: string) {
    return str.split('.');
  }

  static from_user(user: User): ValueContainer {
    return new ValueContainer(
      {
        id: user.id,
        username: user.username,
        tag: user.tag,
      },
      user.id,
    );
  }

  static from_string_select_interaction(
    int: StringSelectMenuInteraction,
    data: SelectionStart,
  ): Result<ValueContainer, Error> {
    const value = int.values[0];
    const option = data.options.find((opt) => opt.option_id === value);
    if (!value || !option) return err(new Error("missing 'value' or 'option'"));

    return ok(
      new ValueContainer(
        {
          id: value,
          label: option.title,
          description: option.description ?? null,
        },
        value,
      ),
    );
  }
}

export type SupportedInteractionType = ButtonInteraction | StringSelectMenuInteraction;
export type SupportedInteractionTypeWithGuild = SupportedInteractionType & {
  guildId: string;
  guild: Guild;
};
export type ValidPropertyReturn = string | number | (string | number)[] | null;

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
    extra_buttons: ButtonBuilder[] = [],
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

    action_row.addComponents([button, ...extra_buttons]);

    const buttons = [button, ...extra_buttons];

    const promises = buttons.map((btn) => {
      return component_service.wait_for_interaction(
        btn,
        (int) => int.user.id === interaction.user.id,
      );
    });

    const embed = new EmbedBuilder();
    embed.setTitle(display_overides?.embed_title ?? 'Please press button');
    embed.setColor(display_overides?.embed_colour ?? (config.style.info.colour as ColorResolvable));
    if (display_overides?.embed_description)
      embed.setDescription(display_overides.embed_description);

    const could_send_reply = await safe_reply(interaction, {
      embeds: [embed],
      components: [action_row],
      flags: 'Ephemeral',
    });
    if (could_send_reply.isErr()) {
      this.l.error('could not prompt user input', could_send_reply.error);
      return err(could_send_reply.error);
    }

    const reply_results = await ResultAsync.fromPromise(Promise.race(promises), map_err);
    if (reply_results.isErr()) return err(reply_results.error);
    if (reply_results.value.isErr()) return err(map_err(reply_results.value.error));
    const resolved_button = reply_results.value.value;

    return ok(resolved_button);
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
