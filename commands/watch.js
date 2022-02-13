const { NULL } = require('mysql/lib/protocol/constants/types');

const threads = require('../index').threads,
  getText = require('../utils/getText'),
  { addThread, removeThread } = require('../utils/threadActions.js'),
  { CommandInteraction, Permissions } = require('discord.js');

/**
 * 
 * @param {*} client 
 * @param {CommandInteraction} interaction 
 * @param {*} respond 
 */
const run = (client, interaction, getBaseEmbed) => {
  let color = '#dd3333';
  let description;
  let ephemeral = true;
  const thread = interaction.options.getChannel('thread');
  let title;

  if (!interaction.member.permissionsIn(thread.parent).has(Permissions.FLAGS.MANAGE_THREADS)) {
    description = getText('watch-user-access-denied', interaction.locale);
    title = getText('user-access-denied', interaction.locale);
  }
  else if (threads.has(thread.id)) {
    try {
      removeThread(thread.id);

      description = getText('watch-unwatch-ok-description', interaction.locale, {
        id: thread.id
      });

      ephemeral = false;
      title = getText('watch-unwatch-ok-title', interaction.locale);
    }
    catch (err) {
      console.error(err);
      description = getText('error-occurred', interaction.locale);
      title = getText('watch-unwatch-error', interaction.locale);
    }
  }
  else if (thread.locked) {
    description = getText('watch-watch-locked-description', interaction.locale);
    title = getText('watch-watch-locked-title', interaction.locale);
  }
  else if (thread.sendable) {
    try {
      // Rememer to remove null below 
      addThread(thread.id, interaction.guildId, (Date.now() / 1000) + (thread.autoArchiveDuration * 60));
      color = '#00af89';

      description = getText('watch-watch-ok-description', interaction.locale, {
        id: thread.id
      });

      ephemeral = false;
      title = getText('watch-watch-ok-title', interaction.locale);
    }
    catch (err) {
      console.error(err);
      description = getText('error-occurred', interaction.locale);
      title = getText('watch-watch-error', interaction.locale);
    }
  }
  else {
    description = getText('watch-watch-bot-access-denied-description', interaction.locale);
    title = getText('watch-watch-bot-access-denied-title', interaction.locale);
  }

  const embed = getBaseEmbed(title, description, !ephemeral);
  embed.setColor(color);

  interaction.reply({
    embeds: [ embed ],
    ephemeral: ephemeral
  });
};

const data = {
  description: 'Watch or unwatch a thread to keep it active.',
  name: 'watch',
  options: [
    {
      channel_types: [10, 11, 12],
      description: 'Thread to watch or unwatch',
      name: 'thread',
      required: true,
      type: 7,
    }
  ]
};

module.exports = { run, data };