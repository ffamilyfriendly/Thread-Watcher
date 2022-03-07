const { CommandInteraction, MessageEmbed } = require('discord.js');
const config = require("../config")

// This function cleans up and prepares the
// result of our eval command input for sending
// to the channel
const clean = async (text) => {
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
    text = text
      .replace(/`/g, "`" + String.fromCharCode(8203))
      .replace(/@/g, "@" + String.fromCharCode(8203));
    
    // Send off the cleaned up result
    return text;
}

/**
 * 
 * @param {*} client 
 * @param {CommandInteraction} interaction 
 * @param {*} respond 
 */
const run = async (client, interaction, respond) => {
    if(!config.owners.includes(interaction.member.id)) {
        return interaction.reply( { content: "no", ephemeral: true } )
    }

    const code = interaction.options.getString("code")
    const public = !(interaction.options.getBoolean("public") || false)

    const embed = new MessageEmbed()
        .addField("Code", `\`\`\`js\n${code}\`\`\``, true)
        .addField("Result", "running...", true)
        .setColor("BLUE")
    await interaction.reply( { embeds: [ embed ], ephemeral: public } )
    const started = Date.now()
    try {
        const res = await clean(eval(code))
        embed.setFooter(`executed in ${(Date.now() - started)}ms`)
        embed.setColor("GREEN")
        embed.fields[1].value = `\`\`\`js\n${res}\`\`\``
    } catch(err) {
        embed.setFooter(`failed in ${(Date.now() - started)}ms`)
        embed.setColor("RED")
        embed.fields[1].value = `\`\`\`js\n${err.toString()}\`\`\``
    }
    interaction.editReply({ embeds: [ embed ] })
};

const data = {
  name:"eval",
  description: "evaluate code as the bot (owner only)",
  options: [
      {
          name: "code",
          description: "the code",
          required: true,
          type: 3
      },
      {
          name: "public",
          description: "wheter or not to show the result publicly (default false)",
          type: 5
      }
  ]
}

module.exports = { run, data, devServerOnly: true };
