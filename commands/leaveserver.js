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
    const guild = await client.guilds.cache.get(guildID)

    const blacklist = interaction.options.getBoolean("blacklist")

    if(!guild) {
        return interaction.reply( { content:`could not fetch guild with id ${guildID}.`, ephemeral: true } )
    }

    const e = new MessageEmbed()
        e.setTitle(`Guild: ${guild.name}`)
        e.addField("Owner", guild.ownerId)
        e.addField("server id", guild.id)
        e.setColor("RED")
        e.setTimestamp()
        
    const row = new MessageActionRow()

    const leave = new MessageButton()
    leave.setStyle("DANGER")
    leave.customId = "LEAVE"
    leave.label = "leave"

    row.addComponents(leave)

    await interaction.reply( { embeds:[ e ], components: [ row ] } )    

    client.once("interactionCreate", async click => {
        if(!click.isButton()) return
        guild.leave()
        interaction.editReply({ content: "left server" })
        if(blacklist) {
            const modal = new Modal()
                .setCustomId("blacklistModal")
                .setTitle(`blacklisting ${guild.name}`)

            const reason = new TextInputComponent()
                .setCustomId("reasonText")
                .setLabel("Reason for blacklist?")
                .setStyle("PARAGRAPH")

            modal.addComponents(new MessageActionRow().addComponents(reason))
            await click.showModal(modal)

            client.once("interactionCreate", modalAnswer => {
                if(!modalAnswer.isModalSubmit()) return
                db.setBlacklistEntry(guildID, modalAnswer.components[0].components[0].value)
                modalAnswer.reply("blacklisted guild!")
            })
        }
    })

};

const data = {
  name:"leaveserver",
  description: "leave a server",
  options: [
      {
          name: "guild",
          description: "the guild to leave",
          required: true,
          type: 3
      },
      {
          name: "blacklist",
          description: "should the guild be blacklisted from adding threadwatcher again?",
          required: true,
          type: 5
      }
  ]
}

module.exports = { run, data, devServerOnly: true };
