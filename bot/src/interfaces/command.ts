import { CommandInteraction, SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder, PermissionResolvable, ChatInputCommandInteraction } from "discord.js";

export interface Command {
    data: Omit<SlashCommandBuilder, "addSubcommandGroup" | "addSubcommand"> | SlashCommandSubcommandsOnlyBuilder,
    gatekeeping?: {
        ownerOnly: Boolean,
        userPermissions?: PermissionResolvable[],
        devServerOnly: Boolean
    },
    run: (interaction: ChatInputCommandInteraction) => Promise<void>
}