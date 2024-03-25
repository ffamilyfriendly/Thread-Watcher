import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import loadCommands from "../../utilities/loadCommands";
import { commands } from "../../bot";
import { Command, statusType } from "../../interfaces/command";
import reloadCommands from "../../utilities/routines/reloadCommands";

// This function cleans up and prepares the
// result of our eval command input for sending
// to the channel
const clean = async (text: string) => {
    // If our input is a promise, await it before continuing
    if (text && text.constructor.name == "Promise")
      text = await text;
    
    // If the response isn't a string, `util.inspect()`
    // is used to 'stringify' the code in a safe way that
    // won't error out on objects with circular references
    // (like Collections, for example)
    if (typeof text !== "string")
      text = require("util").inspect(text, { depth: 1 });
    
    // Replace symbols with character code alternatives
    text = text.replace(/[`@]/g, m => `${m}\u200b`);
    
    // Send off the cleaned up result
    return text;
}

const evalCommand: Command = {
    run: async (interaction: ChatInputCommandInteraction, buildBaseEmbed) => {

        const code = interaction.options.getString("code")
        if(!code) return
        await interaction.deferReply({ ephemeral: true })
        const started = Date.now()

        try {
            const res = await clean(eval(code))
            buildBaseEmbed("Executed code", statusType.success, { fields: [
                { name:"Code", value: `\`\`\`js\n${code}\n\`\`\`` },
                { name:"Result", value: `\`\`\`js\n${res}\n\`\`\`` }
            ], description: `Execution took ${Date.now() - started}ms` })
        } catch(err) {
            buildBaseEmbed("Executed code", statusType.error, { fields: [
                { name:"Code", value: `\`\`\`js\n${code}\n\`\`\`` },
                { name:"Error", value: `\`\`\`js\n${err}\n\`\`\`` }
            ] })
        }
    },
    gatekeeping: {
        ownerOnly: true,
        devServerOnly: true
    },
    data: new SlashCommandBuilder()
        .setName("eval")
        .setDescription("run code")
        .addStringOption((o) => 
            o
            .setName("code")
            .setDescription("the code you want to run")
            .setRequired(true)
        )
}

export default evalCommand