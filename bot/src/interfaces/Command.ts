import {
  ChatInputCommandInteraction,
  CommandInteraction,
  EmbedBuilder,
  PermissionResolvable,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandBuilder,
} from 'discord.js';
import { Result } from 'neverthrow';
import { EmbedBuilderProps } from 'utilities/embed';

export interface AccessControl {
  developer_only?: boolean;
  bot_requires_permission?: PermissionResolvable[];
  invoker_requires_permission?: PermissionResolvable[];
  required_entitlement_sku?: string | string[];
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
}

export interface CommandError {
  message: string;
  error: Error;
}

export interface Command {
  command_data:
    | Omit<SlashCommandBuilder, 'addSubcommandGroup' | 'addSubcommand'>
    | SlashCommandSubcommandBuilder
    | SlashCommandOptionsOnlyBuilder;
  run: (
    interaction: ChatInputCommandInteraction,
    ctx: CommandExecutionContext,
  ) => Result<void, CommandError>;
  access_control: AccessControl;
  command_scope: RegistrationScope;
}
