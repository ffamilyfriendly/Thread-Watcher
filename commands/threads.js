const db = require('../index').db;
const { CommandInteraction, Permissions } = require('discord.js');

/**
 * @param {*} client
 * @param {CommandInteraction} interaction
 * @param {function} handleBaseEmbed
 */
const run = async (client, interaction, handleBaseEmbed) => {
  const db_threads = await db.getThreadsInGuild(interaction.guildId);

  const description = getText('threads-description', interaction.locale, {
    'thread-amount': db_threads.length
  });

  const title = getText('threads-title', interaction.locale);
  const embed = handleBaseEmbed(title, description, false, '#3366cc', false, null);
  const non_thread_channel_lists = [];
  const thread_lists = [];

  // This includes future-proofing for adding support to show registered channels.
  for (const i = 1; i <= 1; i++) {
    const db_channels = (i === 1) ? db_threads : null;
    const lists = (i === 1) ? thread_lists : non_thread_channel_lists;

    for (const db_channel of db_channels) {
      const channel = (i === 1) ? interaction.guild.channels.cache.get(db_channel.id) : client.channels.cache.get(db_channel.id);

      if (!interaction.member.permissionsIn(channel).has(Permissions.FLAGS.VIEW_CHANNEL)) {
        continue;
      }

      let status = null;

      if (channel.isThread() && channel.locked) {
        status = getText('threads-status-locked', interaction.locale);
      }
      else if (channel.viewable) {
        const ok = channel.isThread() ? channel.sendable : interaction.guild.me.permissionsIn(channel).has(Permissions.FLAGS.SEND_MESSAGES_IN_THREADS);

        if (!ok) {
          status = getText('threads-status-cannot-unarchive', interaction.locale);
        }
      }
      else {
        status = getText('threads-status-cannot-unarchive', interaction.locale);
      }

      const current = (status === null) ? channel.toString() : `~~${channel.toString()}~~ (${status})`;

      if (lists.length <= 0) {
        lists.push(current);
        continue;
      }

      const index = lists.length - 1;
      const list = `${lists[index]}, ${current}`;

      if (list.length > 1024) {
        lists.push(current);
      }
      else {
        lists[index] = list;
      }
    }

    let first_field = true;

    for (const list of lists) {
      const field_name_locale_string = (i === 1) ? 'threads-field-threads' : null;
      const field_name = first_field ? getText(field_name_locale_string, interaction.locale) : '\u200b';
      first_field = false;
      embed.addField(field_name, list);
    }
  }

  interaction.reply({
    embeds: [embed],
    ephemeral: true
  });
};

const data = {
  description: 'Show watched threads.',
  name: 'threads'
};

module.exports = { run, data };
