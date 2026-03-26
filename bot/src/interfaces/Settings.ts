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
import { z } from 'zod';

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
  to_string(value: T): Result<string, Error>;
  is_type(value: unknown): value is T;
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

  to_string(value: string): Result<string, Error> {
    return ok(value);
  }

  parse_interaction(
    interaction: InteractionForComponent<ChannelSelectMenuBuilder>,
  ): Result<string, Error> {
    if (!interaction.values[0]) return err(new Error('no channel was selected'));
    return ok(interaction.values[0]);
  }

  is_type(value: unknown): value is string {
    return typeof value == 'string';
  }

  display_value(value: string | null): string {
    return `<#${value}>`;
  }
}

class RoleSelectAdapter implements InputAdapter<string, RoleSelectMenuBuilder> {
  create_component() {
    return new RoleSelectMenuBuilder();
  }

  into(value: unknown): Result<string, Error> {
    if (typeof value === 'string') {
      return ok(value);
    } else return err(new Error(`could not turn ${typeof value} into string`));
  }

  to_string(value: string): Result<string, Error> {
    return ok(value);
  }

  parse_interaction(
    interaction: InteractionForComponent<RoleSelectMenuBuilder>,
  ): Result<string, Error> {
    if (!interaction.values[0]) return err(new Error('no channel was selected'));
    return ok(interaction.values[0]);
  }

  is_type(value: unknown): value is string {
    return typeof value == 'string';
  }

  display_value(value: string | null): string {
    return `<@&${value}>`;
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

  to_string(value: string): Result<string, Error> {
    return ok(value);
  }

  is_type(value: unknown): value is string {
    return typeof value == 'string';
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
  schema: z.ZodType<T>;
  description: string;
}

const LOGGING_CHANNEL: SettingSchema<string> = {
  key: 'LOGGING_CHANNEL',
  name: 'Logging Channel',
  adapter: new ChannelSelectAdapter(),
  default: null,
  type: 'channel',
  schema: z.string(),
  description: 'the channel where logs will be sent to',
};

const BUMP_BEHAVIOUR: SettingSchema<string> = {
  key: 'BUMP_BEHAVIOUR',
  name: 'Bump Behaviour',
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
  schema: z.enum(['BUMP_AND_UNARCHIVE', 'UNARCHIVE_ONLY']),
  description: 'the behaviour of the bot idk',
};

const BOT_MASTER_ROLE: SettingSchema<string> = {
  key: 'BOT_MASTER_ROLE',
  name: 'Bot Master Role',
  adapter: new RoleSelectAdapter(),
  default: null,
  type: 'string',
  schema: z.string(),
  description: 'The role which allows dashboard access',
};

const AUDIT_LOG_RETENTION: SettingSchema<string> = {
  key: 'AUDIT_LOG_RETENTION',
  name: 'Audit Log Retention',
  adapter: new StringSelectAdapter([
    {
      label: '24 Hours',
      value: '86400',
    },
    {
      label: '30 Days',
      value: '2592000',
    },
    {
      label: '90 Days',
      value: '7776000',
    },
  ]),
  default: '86400',
  schema: z.enum(['86400', '2592000', '7776000']),
  type: 'string',
  description: 'How long to retain audit logs for your server',
};

const settings_map = new Map([
  ['LOGGING_CHANNEL', LOGGING_CHANNEL],
  ['BUMP_BEHAVIOUR', BUMP_BEHAVIOUR],
  ['BOT_MASTER_ROLE', BOT_MASTER_ROLE],
  ['AUDIT_LOG_RETENTION', AUDIT_LOG_RETENTION],
]);

export default settings_map;
