const { CommandInteraction, MessageEmbed, MessageActionRow, MessageButton, Modal, TextInputComponent } = require('discord.js');
const config = require("../config")
const { db } = require("../index")

/**
 * 
 * @param {*} client 
 * @param {CommandInteraction} interaction 
 * @param {*} respond 
 * @returns 
 */
const run = async (client, interaction, respond) => {
    if(!config.owners.includes(interaction.member.id)) {
        return interaction.reply( { content: "no", ephemeral: true } )
    }

    const guildID = interaction.options.getString("guild")

    db.removeBlacklistEntry(guildID)

    interaction.reply("done")
};

const data = {
  name:"removeblacklist",
  description: "remove server from blacklist",
  options: [
      {
          name: "guild",
          description: "the guild to remove blacklist from",
          required: true,
          type: 3
      }
  ]
}

module.exports = { run, data, devServerOnly: true };
