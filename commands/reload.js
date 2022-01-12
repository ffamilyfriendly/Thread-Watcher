const { CommandInteraction } = require('discord.js');
const config = require("../config")

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

    require("../index").loadCommands(true)

    interaction.reply({ content: `sure thing, <@${interaction.member.id}>!`, ephemeral: true })
};

const data = {
  name:"reload",
  description: "reloads commands"
}

module.exports = { run, data, allowedGuild: "874566459429355581" };
