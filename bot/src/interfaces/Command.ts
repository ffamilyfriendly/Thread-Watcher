import {
  type Command as BaseCommand,
  type SubCommand as BaseSubCommand,
} from './BaseCommandInterface';
import { CommandContext } from 'utilities/command_context';
export * from './BaseCommandInterface';
export type Command = BaseCommand<CommandContext>;
export type SubCommand = BaseSubCommand<CommandContext>;
