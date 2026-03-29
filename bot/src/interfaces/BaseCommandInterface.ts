import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  Guild,
  PermissionResolvable,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';
import { Result } from 'neverthrow';
import { CommandError } from 'utilities/error/def';

export interface AccessControl {
  developer_only?: boolean;
  bot_requires_permission?: PermissionResolvable[];
  invoker_requires_permission?: PermissionResolvable[];
  // The name of the option that might hold the channel / thread
  channel_option_name?: string;
  required_entitlement_sku?: string;
}

export enum RegistrationScope {
  // For commands we want registered anywhere by default
  GLOBAL,
  // For command we only want to be registered on the dev server
  DEVELOPMENT_SERVER,
  // For command we dont want registered anywhere by default
  NONE,
}

export interface GuildChatInteraction extends ChatInputCommandInteraction {
  guild: Guild;
  guildId: string;
}

export type CleanupFunction = (interaction: GuildChatInteraction) => void;
export interface PostExecutionTasks {
  cleanup: {
    func: CleanupFunction;
    cleanup_timing?: number;
  };
}

export interface BaseCommand {
  command_data:
    | Omit<SlashCommandBuilder, 'addSubcommandGroup' | 'addSubcommand'>
    | SlashCommandSubcommandsOnlyBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandBuilder;
  access_control: AccessControl;
  command_scope: RegistrationScope;
}

export interface Command<TCommandCTX> extends BaseCommand {
  run: (
    interaction: GuildChatInteraction,
    ctx: TCommandCTX,
  ) => Promise<Result<unknown, CommandError>> | Result<unknown, CommandError>;
  autocomplete?: (
    interaction: AutocompleteInteraction,
  ) => Result<unknown, CommandError> | Promise<Result<unknown, CommandError>>;
  access_control: AccessControl;
  command_scope: RegistrationScope;
}

export interface SubCommand<TCommandCTX> extends Command<TCommandCTX> {
  parent_command: string;
}
