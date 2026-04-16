import { Settings } from '@watcher/shared';
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

class StringSelectAdapter<T extends string = string> implements InputAdapter<
  T,
  StringSelectMenuBuilder
> {
  constructor(private values: SelectMenuComponentOptionData[]) {}

  create_component() {
    return new StringSelectMenuBuilder().addOptions(this.values);
  }

  into(value: unknown): Result<T, Error> {
    if (typeof value === 'string') {
      return ok(value as T);
    } else return err(new Error(`could not turn ${typeof value} into string`));
  }

  to_string(value: string): Result<string, Error> {
    return ok(value);
  }

  is_type(value: unknown): value is T {
    return typeof value == 'string';
  }

  parse_interaction(
    interaction: InteractionForComponent<StringSelectMenuBuilder>,
  ): Result<T, Error> {
    const val = interaction.values[0];
    if (!val) return err(new Error('no string was selected'));
    return ok(val as T);
  }

  display_value(value: string | null): string {
    const option = this.values.find((v) => v.value === value);
    return option?.label ?? value ?? '<null>';
  }
}

// 1. Define a helper to extract the component type based on the setting definition
// This assumes your shared Settings has a 'type' field ('channel', 'role', 'string', etc.)
type ComponentForKey<K extends Settings.SettingKey> =
  (typeof Settings.SETTINGS)[K]['type'] extends 'channel'
    ? ChannelSelectMenuBuilder
    : (typeof Settings.SETTINGS)[K]['type'] extends 'role'
      ? RoleSelectMenuBuilder
      : StringSelectMenuBuilder; // Default to string select

// 2. Define the adapters object using a Mapped Type
const adapters: {
  [K in Settings.SettingKey]: InputAdapter<Settings.SettingOutput<K>, ComponentForKey<K>>;
} = {
  LOGGING_CHANNEL: new ChannelSelectAdapter(),
  BUMP_BEHAVIOUR: new StringSelectAdapter([...Settings.SETTINGS.BUMP_BEHAVIOUR.options]),
  BOT_MASTER_ROLE: new RoleSelectAdapter(),
  AUDIT_LOG_RETENTION: new StringSelectAdapter([...Settings.SETTINGS.AUDIT_LOG_RETENTION.options]),
};

// 3. Update the getter to return the specific mapped type
export function get_adapter<K extends Settings.SettingKey>(
  key: K,
): InputAdapter<Settings.SettingOutput<K>, ComponentForKey<K>> {
  return adapters[key];
}
