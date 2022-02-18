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

  if (db_threads.length <= 0) {
    handleBaseEmbed(title, description, false, '#3366cc', true, true);
    return;
  }

  const embed = handleBaseEmbed(title, description, false, '#3366cc', false, null);
  const field_values = [];

  for (const db_thread of db_threads) {
    const thread = interaction.channel.threads.cache.get(db_thread.id);

    if (!interaction.member.permissionsIn(thread).has(Permissions.FLAGS.VIEW_CHANNEL)) {
      continue;
    }

    const status_locked = getText('threads-status-locked', interaction.locale);
    const current = thread.locked ? `~~${thread.toString()}~~ (${status_locked})` : thread.toString();

    if (field_values.length <= 0) {
      field_values.push(current);
      continue;
    }

    const index = field_values.length - 1;
    const list = `${field_values[index]}, ${current}`;

    if (list.length > 1024) {
      field_values.push(current);
    }
    else {
      field_values[index] = list;
    }
  }

  let first_field = true;

  for (const field_value of field_values) {
    const field_name = first_field ? getText('threads-field-threads', interaction.locale) : '\u200b';
    first_field = false;
    embed.addField(field_name, field_value);
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