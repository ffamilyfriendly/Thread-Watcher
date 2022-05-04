const DB = require('../index').db;
const getLocaleString = require('../utils/getText');
const { Permissions } = require('discord.js');

/**
 * @param {*} client
 * @param {*} interaction
 * @param {Function} handleBaseEmbed
 */
const run = async (client, interaction, handleBaseEmbed) => {
  const [activeFetchedThreads, channelCollection, watchedThreads] = await Promise.all([
    interaction.guild.channels.fetchActiveThreads(),
    interaction.guild.channels.fetch(),
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
      let channel = null;

      if (i === 1) {
        if (activeFetchedThreads.threads.has(DBChannel.id)) {
          channel = activeFetchedThreads.threads.get(DBChannel.id);
        }
        else {
          for (const currentChannel of channelCollection.values()) {
            // GuildChannel#isText() should not be used because of forum channels and text-in-voce.
            if (!('threads' in currentChannel && currentChannel.viewable)) {
              continue;
            }

            const botPermissions = interaction.guild.me.permissionsIn(currentChannel);

            if (!botPermissions.has(Permissions.FLAGS.READ_MESSAGE_HISTORY)) {
              continue;
            }

            const promises = [currentChannel.threads.fetchArchived()];

            if (currentChannel.type === 'GUILD_TEXT') {
              promises.push(currentChannel.threads.fetchArchived({
                fetchAll: botPermissions.has(Permissions.FLAGS.MANAGE_THREADS),
                type: 'private'
              }));
            }

            const [archivedPublicFetchedThreads, archivedPrivateFetchedThreads] = await Promise.all(promises);
            channel = archivedPublicFetchedThreads.threads.get(DBChannel.id) ?? archivedPrivateFetchedThreads?.threads.get(DBChannel.id);

            if (channel !== undefined) {
              break;
            }
          }
        }
      }
      else {
        channel = channelCollection.get(DBChannel.id);
      }

      // null or undefined
      if (channel == null) {
        const statusUnknownThread = getLocaleString('threads-status-unknown-thread', interaction.locale);
        items.push(`\`${DBChannel.id}\` (${statusUnknownThread})`);
        continue;
      }

      const humanPermissions = interaction.member.permissionsIn(channel);

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

  interaction.editReply({
    embeds: [embed]
  });
};

const data = {
  description: 'Show watched threads.',
  name: 'threads'
};

module.exports = { run, data };