const { db } = require("../index")
const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js")
const { supportServerInvite } = require("../config")

const run = ( client ) => {
    client.on("guildCreate", async(guild) => {
        const entry = await db.getBlacklistEntry(guild.id)
        if(entry) {
            console.log(entry)
            const owner = await guild.fetchOwner()
            const embed = new MessageEmbed()
            embed.setTitle(`Your server ${guild.name} (${guild.id}) has been blacklisted`)
            embed.addField("**Reason**", entry.reason||"No reason found")

            const buttonRow = new MessageActionRow()
            const appealButton = new MessageButton()
                .setStyle("LINK")
                .setLabel("Appeal blacklisting")
                .setURL(supportServerInvite)

            buttonRow.addComponents(appealButton)

            owner.send({ embeds: [embed], components:[ buttonRow ] })
            .catch(err => {
                console.log(`failed to notify ${owner.id} of blacklist for guild ${guild.id}`)
            })
            guild.leave()
        }
    })
}

module.exports = { run }