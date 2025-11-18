import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Guild,
  Interaction,
  PermissionResolvable,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';
import { Result } from 'neverthrow';
import { EmbedBuilderProps } from 'utilities/embed';
import { DatabaseError } from './Database';
import { Logger } from 'tslog';

type LacksPermission = 'bot' | 'user';

export class PermissionsError extends Error {
  missing_perm: PermissionResolvable;
  whos_lackin: LacksPermission;

  constructor(required_permission: PermissionResolvable, whos_lackin: LacksPermission = 'user') {
    super(`${whos_lackin} is missing the perm ${required_permission}`);
    this.name = 'PermissionsError';
    this.missing_perm = required_permission;
    this.whos_lackin = whos_lackin;
  }
}

export class GenericCommandError extends Error {
  title: string;
  message: string;
  docs_slug?: string;

  constructor(title: string, message: string, docs_slug?: string) {
    super(message);
    this.title = title;
    this.message = message;
    this.docs_slug = docs_slug;
  }
}

export class EntitlementsError extends Error {
  sku_id: string;
  constructor(sku_id: string) {
    super(`Command requires SKU ${sku_id}`);
    this.sku_id = sku_id;
  }
}

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

export interface CommandExecutionContext {
  build_embed: (props: EmbedBuilderProps) => EmbedBuilder;
  send_audit: (
    embed_param: EmbedBuilder | EmbedBuilder[],
    overwrite_interaction?: Interaction,
  ) => void;
  // i18n
  t: (
    key: string,
    options?: {
      [key: string]: unknown;
    },
  ) => string;
  logger: Logger<unknown>;
}

export type CommandError = DatabaseError | PermissionsError | GenericCommandError;

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

export interface Command extends BaseCommand {
  run: (
    interaction: GuildChatInteraction,
    ctx: CommandExecutionContext,
  ) => Result<void, CommandError> | Promise<Result<void | PostExecutionTasks, CommandError>>;
  autocomplete?: (
    interaction: AutocompleteInteraction,
  ) => Result<void, CommandError> | Promise<Result<void, CommandError>>;
  access_control: AccessControl;
  command_scope: RegistrationScope;
}

export interface SubCommand extends Command {
  parent_command: string;
}
