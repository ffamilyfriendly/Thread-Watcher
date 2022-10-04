import { ChatInputCommandInteraction, CommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { Command } from "src/interfaces/command";

const test: Command = {

    run: async (interaction: ChatInputCommandInteraction) => {
        interaction.reply(`test ${interaction.options.getBoolean("kekw") ? "<:kekw:960963125371371600>" : ""}`)
    },
    gatekeeping: {
        ownerOnly: false,
        devServerOnly: true,
        userPermissions: [ PermissionFlagsBits.ManageThreads ]
    },
    data: new SlashCommandBuilder()
        .setName("test")
        .setDescription("this is a test command for the typescript bot")
        .addBooleanOption((o) => 
            o
            .setName("kekw")
            .setDescription("this will add a wacky kekw emoji")
            .setRequired(true)
        )
}

export default test