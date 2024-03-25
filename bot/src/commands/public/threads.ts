import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command, statusType } from "../../interfaces/command";


const info: Command = {
    run: async (interaction: ChatInputCommandInteraction, buildBaseEmbed) => {
        buildBaseEmbed("Command Moved", statusType.info, { description: "the `/threads` command has been moved to `/list`" })
    },
    data: new SlashCommandBuilder()
        .setName("threads")
        .setDescription("deprecated")
}

export default info