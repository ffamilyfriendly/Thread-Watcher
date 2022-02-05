const { CommandInteraction, MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const config = require("../config")

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
    const guild = await client.guilds.fetch(guildID)

    if(!guild) {
        return interaction.reply( { content:`could not fetch guild with id ${guildID}.`, ephemeral: true } )
    }

    const e = new MessageEmbed()
    e.title(`Guild ${guild.name}`)
        e.addField("Owner", guild.ownerId)
        e.setField("Created at", guild.createdAt)
        e.setField("tw joined at", guild.joinedAt)
        e.setField("server id", guild.id)
        e.setColor("RED")
        e.setTimestamp()
        
    const row = new MessageActionRow()

    const leave = new MessageButton()
    leave.setStyle("DANGER")
    leave.customId = "LEAVE"
    leave.label = "leave"

    row.addComponents(leave)

    await interaction.reply( { embeds:[ e ], components: [ row ] } )

    const filter = (ans) => ans.customId === "LEAVE" && config.owners.includes(ans.user.id)
    const col = interaction.channel.createMessageCollector({ filter, time: 1000 * 30 })
    col.once("collect", i => {
        console.log(i)
    })
    

    client.once("interactionCreate", click => {
        if(!click.isButton()) return
        guild.leave()
        interaction.editReply({ content: "left server" })
    })

};

const data = {
  name:"eval",
  description: "evaluate code as the bot (owner only)",
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

module.exports = { run, data, allowedGuild: "874566459429355581" };
