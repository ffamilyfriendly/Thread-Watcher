const { CommandInteraction, MessageEmbed, Client } = require('discord.js'),
    { db } = require("../index"),
    config = require("../config")

/**
 * 
 * @param {Client} client 
 * @param {CommandInteraction} interaction 
 * @param {Function} handleBaseEmbed 
 */
const run = async (client, interaction, handleBaseEmbed) => {
  // keeping sid in this function because i'm too lazy to change all refferences to checkIfBotCanManageThread
  // Hacky fix
  const checkIfBotCanManageThread = (server_id, channel_id) => {
    const channel = client.channels.cache.get(channel_id);

    if (!channel) {
      return false;
    }

    return channel.isThread() ? channel.sendable : channel.permissionsFor(channel.guild.me).has(Discord.Permissions.FLAGS.SEND_MESSAGES_IN_THREADS);
  }

    await interaction.deferReply({ ephemeral: true })
    const guild = await client.guilds.cache.get(interaction.options.getString("guild"))

    if (!guild) {
      handleBaseEmbed('Guild not cached', 'thread watcher might not be in that guild or that guild has not yet been cached', false, '#dd3333', true, true);
      return;
    }
    else if (![...config.owners, guild.ownerId].includes(interaction.user.id)) {
      handleBaseEmbed('no can do', 'you need to own that guild or own this thread watcher instance to do that', false, '#dd3333', true, true);
      return;
    }

    const threads = await db.getThreadsInGuild(guild.id)

    const embed = new MessageEmbed()
    embed.setTitle(`Diagnosis for ${guild.name}`)
    embed.setColor("GREEN")

    const sendReply = () => {
        if(embed.fields.length === 0) embed.addField("No issues found", "this command is not foolproof. If any issues still appear not adressed here please get in touch by stating your issue in <#874566460549242891>")
        interaction.editReply({ embeds:[ embed ] })
    }

    for(let i = 0; i < threads.length; i++) {
        const thread = threads[i]
        client.channels.fetch(thread.id)
        .then(t => {
            if(t.locked || !checkIfBotCanManageThread(guild.id, t.id)) {
                embed.addField(`Error for ${t.name}`, `
                ${checkIfBotCanManageThread(guild.id, t.id) ? "" : "**thread watcher cannot send messages to this thread** this is required for thread watcher to be able to unarchive a thread\n"}${t.locked ? "**this thread is locked** thread watcher will not unarchive locked threads\n" : ""}\n__**tag:**__ <#${t.id}>
                `)
                embed.setColor("RED")
            }

            if(i === threads.length-1) sendReply()
        })
        .catch(() => {
            embed.addField(`Error for <#${thread.id}>`, "thread watcher failed to fetch this thread. It might be deleted \n__**tag:**__ <#${thread.id}>")
            if(i === threads.length-1) sendReply()
        })
    }
};

const data = {
  name:"diagnose",
  description: "is thread watcher working poorly for you? This command might be able to help",
  options: [
      {
          name: "guild",
          description: "your guild id",
          required: true,
          type: 3
      }
  ]
}

module.exports = { run, data, devServerOnly: true };
