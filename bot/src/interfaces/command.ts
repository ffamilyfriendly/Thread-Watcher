import {
  ColorResolvable,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  PermissionResolvable,
  ChatInputCommandInteraction,
  EmbedBuilder,
  AutocompleteInteraction,
  ActionRowBuilder,
  SlashCommandOptionsOnlyBuilder,
} from "discord.js";

export enum statusType {
  error = "error",
  success = "success",
  info = "info",
  warning = "warning",
}

export interface baseEmbedOptions {
  description?: string;
  color?: ColorResolvable;
  fields?: { name: string; value: string }[];
  ephermal?: boolean;
  showAuthor?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  components?: ActionRowBuilder<any>[];
  noSend?: boolean;
}

export interface Command {
  data:
    | Omit<SlashCommandBuilder, "addSubcommandGroup" | "addSubcommand">
    | SlashCommandSubcommandsOnlyBuilder
    | SlashCommandOptionsOnlyBuilder;
  gatekeeping?: {
    ownerOnly: boolean;
    userPermissions?: PermissionResolvable[];
    botPermissions?: PermissionResolvable[];
    devServerOnly: boolean;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  externalOptions?: any[];
  run: (
    interaction: ChatInputCommandInteraction,
    buildBaseEmbed: (
      title: string,
      status: statusType,
      misc?: baseEmbedOptions,
    ) => EmbedBuilder,
  ) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}
