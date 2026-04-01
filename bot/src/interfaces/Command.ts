import { ConfigType } from 'utilities/config';
import {
  type Command as BaseCommand,
  type SubCommand as BaseSubCommand,
} from './BaseCommandInterface';
import { EmbedBuilder } from 'discord.js';
import { Logger } from 'tslog';
import { TypedI18Func } from 'utilities/i18def';
export * from './BaseCommandInterface';

export interface CommandContext {
  t: TypedI18Func;
  build_embed: (style?: keyof ConfigType['style']) => EmbedBuilder;
  logger: Logger<unknown>;
}

export type Command = BaseCommand<CommandContext>;
export type SubCommand = BaseSubCommand<CommandContext>;
