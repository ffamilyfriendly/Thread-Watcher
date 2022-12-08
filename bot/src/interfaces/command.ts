import { ColorResolvable, SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder, PermissionResolvable, ChatInputCommandInteraction, EmbedBuilder, AutocompleteInteraction, ActionRowBuilder, MessageActionRowComponentData, MessageActionRowComponentBuilder, APIMessageActionRowComponent, Interaction, SelectMenuInteraction } from "discord.js";

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
    showAuthor?: Boolean,
    components?: ActionRowBuilder<any>[],
    noSend?: boolean
}

export interface Command {
    data: Omit<SlashCommandBuilder, "addSubcommandGroup" | "addSubcommand"> | SlashCommandSubcommandsOnlyBuilder,
    gatekeeping?: {
        ownerOnly: Boolean,
        userPermissions?: PermissionResolvable[],
        botPermissions?: PermissionResolvable[]
        devServerOnly: Boolean
    },
    externalOptions?: any[],
    run: (interaction: ChatInputCommandInteraction, buildBaseEmbed: (title: String, status: statusType, misc?: baseEmbedOptions) => EmbedBuilder ) => Promise<void>,
    autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>
}