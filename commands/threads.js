const { cachedUnknownThreads } = require('../index');
const DB = require('../index').db;
const getLocaleString = require('../utils/getText');
const { Permissions, MessageActionRow, MessageButton } = require('discord.js');

/**
 * @param {boolean} thread
 */
const getChannel = async (channelID, thread, activeFetchedThreads, server) => {
  if (thread) {
    if (activeFetchedThreads.threads.has(channelID)) {
      return activeFetchedThreads.threads.get(channelID);
    }
    else if (server.id in cachedUnknownThreads && cachedUnknownThreads[server.id].includes(channelID)) {
      return null;
    }
  }

  let channel;

  try {
    channel = await server.channels.fetch(channelID);
  }
  catch {
    if (!thread) {
      return null;
    }

    if (server.id in cachedUnknownThreads) {
      cachedUnknownThreads[server.id].push(channelID);
    }
    else {
      cachedUnknownThreads[server.id] = [channelID];
    }

    return null;
  }

  return channel;
}

/**
 * @param {*} client
 * @param {*} interaction
 * @param {Function} handleBaseEmbed
 */
const run = async (client, interaction, handleBaseEmbed) => {
  const [activeFetchedThreads, watchedThreads] = await Promise.all([
    interaction.guild.channels.fetchActiveThreads(),
    DB.getThreadsInGuild(interaction.guildId),
    interaction.deferReply({
      ephemeral: true
    })
  ]);

  let description = getLocaleString('threads-description-amount', interaction.locale, {
    'thread-amount': watchedThreads.length
  });

  if (!interaction.memberPermissions.has(Permissions.FLAGS.ADMINISTRATOR)) {
    const visibilityNotice = getLocaleString('threads-description-visibility', interaction.locale);
    description += `\n${visibilityNotice}`;
  }

  const title = getLocaleString('threads-title', interaction.locale);
  const embed = handleBaseEmbed(title, description, false, '#3366cc', false, null);


  // This includes future-proofing for adding support to show registered channels.
  for (let i = 1; i <= 1; i++) {
    const DBChannels = (i === 1) ? watchedThreads : null;
    const items = [];
    const lists = [];

    for (const DBChannel of DBChannels) {
      const channel = await getChannel(DBChannel.id, i === 1, activeFetchedThreads, interaction.guild);
      // null or undefined
      if (channel == null) {
        const statusUnknownThread = getLocaleString('threads-status-unknown-thread', interaction.locale);
        items.push(`\`${DBChannel.id}\` (${statusUnknownThread})`);
        continue;
      }

      const humanPermissions = interaction.member.permissionsIn(channel);

      // handle fucked up d.js cache making humanPermissions null even though channel "exists" (in cache only)
      if(!humanPermissions) {
        const statusUnknownThread = getLocaleString('threads-status-unknown-thread', interaction.locale);
        items.push(`\`${DBChannel.id}\` (${statusUnknownThread})`);
        // push broken channel to broken channel cache
        if(!(DBChannel.id in cachedUnknownThreads[interaction.guildId])) cachedUnknownThreads[interaction.guildId].push(DBChannel.id);
        continue;
      }

      if (!humanPermissions.has(Permissions.FLAGS.VIEW_CHANNEL)) {
        continue;
      }
      // Checking thread membership is not possible because ThreadMemberManager#fetch() requires GUILD_MEMBERS privileged intent.
      else if (channel.type === 'GUILD_PRIVATE_THREAD' && !humanPermissions.has(Permissions.FLAGS.MANAGE_THREADS)) {
        continue;
      }

      let status = null;

      if (channel.isThread() && channel.locked) {
        status = getLocaleString('threads-status-locked', interaction.locale);
      }
      else if (channel.viewable) {
        const ok = channel.isThread() ? channel.sendable : interaction.guild.me.permissionsIn(channel).has(Permissions.FLAGS.SEND_MESSAGES_IN_THREADS);

        if (!ok) {
          status = getLocaleString('threads-status-cannot-unarchive', interaction.locale);
        }
      }
      else {
        status = getLocaleString('threads-status-cannot-unarchive', interaction.locale);
      }

      const item = (status === null) ? channel.toString() : `~~${channel}~~ (${status})`;
      items.push(item);
    }

    for (const item of items) {
      if (lists.length === 0) {
        lists.push(item);
        continue;
      }

      const index = lists.length - 1;
      const list = `${lists[index]}, ${item}`;

      if (list.length > 1024) {
        lists.push(item);
      }
      else {
        lists[index] = list;
      }
    }

    let firstField = true;

    for (const list of lists) {
      const firstFieldNameStringKey = (i === 1) ? 'threads-field-threads' : null;
      const fieldName = firstField ? getLocaleString(firstFieldNameStringKey, interaction.locale) : '\u200b';
      firstField = false;
      embed.addField(fieldName, list);
    }
  }

  // create the button needed for below code
  const components = new MessageActionRow();
  const purgeUnknown = new MessageButton()
  .setStyle("DANGER")
  .setLabel(getLocaleString("threads-purgeButton", interaction.locale))
  .setEmoji("⚠️")
  // the button id will include the id of this interaction to make sure no mistakes are made
  .setCustomId(`purge-${interaction.id}`)
  
  /**
   * If user has guild wide perm "MANAGE_THREADS" show a button that purges unknown threads from the watchlist.
   * This is done so the user can easily clean up their /threads list without having to manually unwatch threads
   */
  if(interaction.member.permissions.has(Permissions.FLAGS.MANAGE_THREADS) && cachedUnknownThreads[interaction.guildId]?.length > 0) {
    // add the purge button to the threads embed
    components.addComponents(purgeUnknown)

    interaction.editReply({
      embeds: [embed],
      components: [components]
    });

    // make sure that the user who called the command is the same clicking the button. Also verify the interaction is the same
    const filter = (c) => c.customId === `purge-${interaction.id}`;
    // Initiate the component collector. Collector.once will be used since we only need to catch this event once
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 1000 * 10 })

    collector.once("collect", async (col) => {
      const confirmEmbed = handleBaseEmbed(getLocaleString("threads-purgeButton-confirmPrompt", interaction.locale), getLocaleString("threads-purgeButton-confirm-description", interaction.locale, { number: cachedUnknownThreads[interaction.guildId].length }), false, '#cc9633', false, null)
      
      const confirmComponents = new MessageActionRow();

      const confirmButton = new MessageButton()
      .setStyle("PRIMARY")
      .setLabel(getLocaleString("threads-purgeButton-confirm", interaction.locale))
      .setCustomId(`confirm-${interaction.id}`)

      const cancelButton = new MessageButton()
      .setStyle("SECONDARY")
      .setLabel(getLocaleString("threads-purgeButton-cancel", interaction.locale))
      .setCustomId(`cancel-${interaction.id}`)

      // this filter is horrible but works
      const confirmFilter = (c) => ["confirm", "cancel"].includes(c.customId.split("-")[0]) && c.customId.split("-")[1] === interaction.id;
      confirmComponents.addComponents(confirmButton, cancelButton)
      await col.reply({ embeds:[confirmEmbed], components:[confirmComponents] })

      const confirmCollector = interaction.channel.createMessageComponentCollector({ confirmFilter, time: 1000 * 10 })
      confirmCollector.once("collect", (ans) => {
        if(ans.customId.startsWith("cancel")) {
          col.deleteReply()
          col.replyDeleted = true
        } else {
          // unwatch the unknown threads
          for(let ukThread of cachedUnknownThreads[interaction.guildId]) {
            DB.deleteThread(ukThread)
          }
          // empty the cache for this guild as all entries have been unwatched
          cachedUnknownThreads[interaction.guildId] = []

          const successEmbed = handleBaseEmbed(getLocaleString("threads-purgeButton-done", interaction.locale), getLocaleString("threads-purgeButton-done-description", interaction.locale), false, '#7CFC00', false, null)
          confirmButton.setStyle("SUCCESS")
          confirmButton.setDisabled(true)
          confirmComponents.setComponents(confirmButton)
          ans.reply({ embeds:[successEmbed], components:[confirmComponents] })
          col.deleteReply()
          col.replyDeleted = true
        }
        // Stop the collector on the main purge button. This will make it disabled
        collector.stop()
      })

      confirmCollector.once("end", () => {
        // delete the confirm embed unless it has already been deleted by pressing cancel
        if(!col.replyDeleted) col.deleteReply()
      })
    })

    // handle end of life for purge button. Disable the button and edit the reply
    collector.once("end", (e) => {
      purgeUnknown.setDisabled(true)
      interaction.editReply({
        embeds: [embed],
        components: [components]
      });
    })
  } else {
    interaction.editReply({
      embeds: [embed]
    });
  }
};

const data = {
  description: 'Show watched threads.',
  name: 'threads'
};

module.exports = { run, data };