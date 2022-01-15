const db = require('../index').db;
const { CommandInteraction, MessageEmbed } = require('discord.js')

/**
 * 
 * @param {*} client 
 * @param {CommandInteraction} interaction 
 * @param {*} respond 
 */
const run = (client, interaction, respond, l) => {
  let threadsList = db.prepare('SELECT * FROM threads WHERE server = ?').all(interaction.guildId);
  const embed = new MessageEmbed()
  // `thread-watcher is watching ${threadsList.length} threads in your server!`
  .setDescription(l("threads_is_watching", { amount: threadsList.length }))
  .setColor("#008000")
  .setTitle("Thread Watcher")
  .setFooter({ text: "beep boop! familyfriendly.xyz/threads" })

  // this code is so dumb. If anyone actually smort is reading this code (bless your soul) pls fix
  let buf = ""
  let page = 1;
  for(let id of threadsList) {
    let tmp = buf + `<#${id.id}>, `
    if(tmp.length >= 1024) {
      embed.addField(`Group #${page}`, buf)
      buf = `<#${id.id}>`
      page++
    } else buf = tmp
  }
  embed.addField(`Page #${page}`, buf || l("threads_none_watched"))

  interaction.reply({ embeds: [ embed ], ephemeral: true })
}

const data = {
  name:"threads",
  description: "lists all threads in your server that the bot is watching"
}

module.exports = { run, data };
