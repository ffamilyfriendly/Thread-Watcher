import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import loadCommands from "../../utilities/loadCommands";
import { commands } from "../../bot";
import { Command, statusType } from "../../interfaces/command";
import reloadCommands from "../../utilities/routines/reloadCommands";

const reload: Command = {
    run: async (interaction: ChatInputCommandInteraction, buildBaseEmbed) => {

        const all = interaction.options.getBoolean("globally")

        if(all) {
            interaction.deferReply()
            interaction.client.shard?.broadcastEval((_client, a: () => void ) => { a() }, { context: loadCommands })
            .then(results => {
                console.log(results)
                buildBaseEmbed(`Commands reloaded on ${results.length} shards`, statusType.success, { ephermal: true })
            })
        } else {
            reloadCommands()
            buildBaseEmbed("Commands reloaded", statusType.success, { ephermal: true })
        }
    },
    gatekeeping: {
        ownerOnly: true,
        devServerOnly: true
    },
    data: new SlashCommandBuilder()
        .setName("reload")
        .setDescription("use this command to reload commands")
        .addBooleanOption((o) => 
            o
            .setName("globally")
            .setDescription("do you want to reload commands on all shards?")
        )
}

export default reload