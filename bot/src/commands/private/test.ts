import { SlashCommandBuilder } from "discord.js";
import { Command } from "src/interfaces/command";

const test: Command = {

    run: async (interaction) => {
        interaction.reply("test")
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