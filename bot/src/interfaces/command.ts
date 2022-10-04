import { ColorResolvable, SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder, PermissionResolvable, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

export enum statusType {
    error = "error",
    success = "success",
    info = "info",
    warning = "warning"
}

export type baseEmbedOptions = {
    description?: string,
    color?: ColorResolvable,
    fields?: { name: string; value: string }[],
    ephermal?: Boolean,
    showAuthor?: Boolean
}

export interface Command {
    data: Omit<SlashCommandBuilder, "addSubcommandGroup" | "addSubcommand"> | SlashCommandSubcommandsOnlyBuilder,
    gatekeeping?: {
        ownerOnly: Boolean,
        userPermissions?: PermissionResolvable[],
        devServerOnly: Boolean
    },
    run: (interaction: ChatInputCommandInteraction, buildBaseEmbed: (title: String, status: statusType, misc?: baseEmbedOptions) => EmbedBuilder ) => Promise<void>
}