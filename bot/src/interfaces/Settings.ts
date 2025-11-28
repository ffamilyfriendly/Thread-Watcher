import {
  ButtonBuilder,
  ButtonInteraction,
  ChannelSelectMenuBuilder,
  ChannelSelectMenuInteraction,
  ChannelType,
  MessageActionRowComponentBuilder,
  RoleSelectMenuBuilder,
  RoleSelectMenuInteraction,
  SelectMenuComponentOptionData,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
} from 'discord.js';
import { err, ok, Result } from 'neverthrow';

export type SettingValue = number | string | boolean | string[];

export type SettingType = 'number' | 'string' | 'boolean' | 'channel' | 'role';

type InteractionForComponent<CT extends MessageActionRowComponentBuilder> = CT extends ButtonBuilder
  ? ButtonInteraction
  : CT extends RoleSelectMenuBuilder
    ? RoleSelectMenuInteraction
    : CT extends ChannelSelectMenuBuilder
      ? ChannelSelectMenuInteraction
      : CT extends StringSelectMenuBuilder
        ? StringSelectMenuInteraction
        : never;

interface InputAdapter<T, CT extends MessageActionRowComponentBuilder> {
  create_component(): CT;
  parse_interaction(interaction: InteractionForComponent<CT>): Result<T, Error>;
  into(value: unknown): Result<T, Error>;
  display_value(value: T | null): string;
}

class ChannelSelectAdapter implements InputAdapter<string, ChannelSelectMenuBuilder> {
  create_component() {
    return new ChannelSelectMenuBuilder().setChannelTypes(
      ChannelType.GuildText,
      ChannelType.PublicThread,
      ChannelType.PrivateThread,
    );
  }

  into(value: unknown): Result<string, Error> {
    if (typeof value === 'string') {
      return ok(value);
    } else return err(new Error(`could not turn ${typeof value} into string`));
  }

  parse_interaction(
    interaction: InteractionForComponent<ChannelSelectMenuBuilder>,
  ): Result<string, Error> {
    if (!interaction.values[0]) return err(new Error('no channel was selected'));
    return ok(interaction.values[0]);
  }

  display_value(value: string | null): string {
    return `<#${value}>`;
  }
}

class StringSelectAdapter implements InputAdapter<string, StringSelectMenuBuilder> {
  constructor(private values: SelectMenuComponentOptionData[]) {}

  create_component() {
    return new StringSelectMenuBuilder().addOptions(this.values);
  }

  into(value: unknown): Result<string, Error> {
    if (typeof value === 'string') {
      return ok(value);
    } else return err(new Error(`could not turn ${typeof value} into string`));
  }

  parse_interaction(
    interaction: InteractionForComponent<StringSelectMenuBuilder>,
  ): Result<string, Error> {
    if (!interaction.values[0]) return err(new Error('no string was selected'));
    return ok(interaction.values[0]);
  }

  display_value(value: string | null): string {
    return value ?? '<hello>';
  }
}

export interface SettingSchema<T extends SettingValue> {
  key: string;
  name: string;
  default: T | null;
  type: SettingType;
  adapter: InputAdapter<T, MessageActionRowComponentBuilder>;
  validate: (value: unknown) => boolean;
  description: string;
}

const LOGGING_CHANNEL: SettingSchema<string> = {
  key: 'LOGGING_CHANNEL',
  name: 'logging channel',
  adapter: new ChannelSelectAdapter(),
  default: null,
  type: 'channel',
  validate: (value: unknown) => typeof value === 'string' || value === null,
  description: 'the channel where logs will be sent to',
};

const BUMP_BEHAVIOUR: SettingSchema<string> = {
  key: 'BUMP_BEHAVIOUR',
  name: 'bump behaviour',
  adapter: new StringSelectAdapter([
    {
      label: 'Bump and Un-Archive',
      value: 'BUMP_AND_UNARCHIVE',
      description: 'keep thread un-archived and active',
    },
    { label: 'Un-Archive', value: 'UNARCHIVE_ONLY', description: 'Only un-archive the thread' },
  ]),
  default: 'BUMP_AND_UNARCHIVE',
  type: 'string',
  validate: (value: unknown) => typeof value === 'string' || value === null,
  description: 'the behaviour of the bot idk',
};

const settings_map = new Map([
  ['LOGGING_CHANNEL', LOGGING_CHANNEL],
  ['BUMP_BEHAVIOUR', BUMP_BEHAVIOUR],
]);

export default settings_map;
