import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import loadCommands from "../../utilities/loadCommands";
import { commands } from "../../bot";
import { Command, statusType } from "../../interfaces/command";

const reload: Command = {

    run: async (interaction: ChatInputCommandInteraction, buildBaseEmbed) => {
        commands.clear()
        for(const [ key, value ] of loadCommands())
            commands.set(key, value)
        buildBaseEmbed("Commands reloaded", statusType.success, { ephermal: true })
    },
    gatekeeping: {
        ownerOnly: true,
        devServerOnly: true
    },
    data: new SlashCommandBuilder()
        .setName("reload")
        .setDescription("use this command to reload commands")
}

export default reload