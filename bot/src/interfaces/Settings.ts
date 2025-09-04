import { ChannelSelectMenuBuilder, ChannelType, RoleSelectMenuBuilder } from 'discord.js';
import { err, ok, Result } from 'neverthrow';

export type SettingValue = number | string | boolean | string[];

type DiscordComponents = RoleSelectMenuBuilder | ChannelSelectMenuBuilder;
export type SettingType = 'number' | 'string' | 'boolean' | 'channel' | 'role';

export interface SettingSchema<T extends SettingValue> {
  key: string;
  name: string;
  default: T | null;
  discord_input_element: () => DiscordComponents;
  type: SettingType;
  transform_into: (value: unknown) => Result<T, Error>;
  validate: (value: unknown) => boolean;
  description: string;
}

const LOGGING_CHANNEL: SettingSchema<string> = {
  key: 'LOGGING_CHANNEL',
  name: 'logging channel',
  discord_input_element: () =>
    new ChannelSelectMenuBuilder().setChannelTypes(
      ChannelType.GuildText,
      ChannelType.PublicThread,
      ChannelType.PrivateThread,
    ),
  default: null,
  type: 'channel',
  validate: (value: unknown) => typeof value === 'string' || value === null,
  transform_into: (value: unknown) => {
    console.log(`"${value}"`, value, typeof value);
    if (typeof value === 'string') return ok(value);
    else return err(new Error(`can not transform ${typeof value} into string`));
  },
  description: 'the channel where logs will be sent to',
};

const settings_map = new Map([['LOGGING_CHANNEL', LOGGING_CHANNEL]]);

export default settings_map;
