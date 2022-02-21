const db = require('../index').db;
const getText = require('../utils/getText');
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
  const channel_lists = [];
  const thread_lists = [];

  // This includes future-proofing for adding support to show registered channels.
  for (let i = 1; i <= 1; i++) {
    const db_channel_likes = (i === 1) ? db_threads : null;
    const lists = (i === 1) ? thread_lists : channel_lists;

    let channel_like

    for (const db_channel_like of db_channel_likes) {
      for(const [_channelid, channel] of interaction.guild.channels.cache) {
        if(!channel.threads) continue;
        for(const [_threadid, thread] of channel.threads.cache) {
          if(thread.id == db_channel_like.id) {
            channel_like = thread
            break;
          }
        }
      }

      if(!channel_like) continue;

      console.log(channel_like)
      const user_permissions = interaction.member.permissionsIn(channel_like);

      if (!user_permissions.has(Permissions.FLAGS.VIEW_CHANNEL)) {
        continue;
      }
      else if (channel_like.type === 'GUILD_PRIVATE_THREAD' && !(channel_like.members.cache.has(interaction.user.id) || user_permissions.has(Permissions.FLAGS.MANAGE_THREADS))) {
        continue;
      }

      let status = null;

      if (channel_like.isThread() && channel_like.locked) {
        status = getText('threads-status-locked', interaction.locale);
      }
      else if (channel_like.viewable) {
        const ok = channel_like.isThread() ? channel_like.sendable : interaction.guild.me.permissionsIn(channel_like).has(Permissions.FLAGS.SEND_MESSAGES_IN_THREADS);

        if (!ok) {
          status = getText('threads-status-cannot-unarchive', interaction.locale);
        }
      }
      else {
        status = getText('threads-status-cannot-unarchive', interaction.locale);
      }

      const current = (status === null) ? channel_like.toString() : `~~${channel_like.toString()}~~ (${status})`;

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
      const first_field_name_locale_string = (i === 1) ? 'threads-field-threads' : null;
      const field_name = first_field ? getText(first_field_name_locale_string, interaction.locale) : '\u200b';
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