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
const run = (client, interaction, handleBaseEmbed) => {
  const thread = interaction.options.getChannel('thread');

  if (!interaction.member.permissionsIn(thread.parent).has(Permissions.FLAGS.MANAGE_THREADS)) {
    const description = getText('watch-user-access-denied', interaction.locale);
    const title = getText('user-access-denied', interaction.locale);
    handleBaseEmbed(title, description, false, '#dd3333', true, true);
    return;
  }

  if (threads.has(thread.id)) {
    try {
      removeThread(thread.id);

      const description = getText('watch-unwatch-ok-description', interaction.locale, {
        id: thread.id
      });

      const title = getText('watch-unwatch-ok-title', interaction.locale);
      handleBaseEmbed(title, description, true, '#dd3333', true, false);
    }
    catch (err) {
      console.error(err);
      const description = getText('error-occurred', interaction.locale);
      const title = getText('watch-unwatch-error', interaction.locale);
      handleBaseEmbed(title, description, false, '#dd3333', true, false);
    }

    return;
  }

  if (thread.locked) {
    const description = getText('watch-watch-locked-description', interaction.locale);
    const title = getText('watch-watch-locked-title', interaction.locale);
    handleBaseEmbed(title, description, false, '#dd3333', true, true);
    return;
  }

  if (!thread.sendable) {
    const description = getText('watch-watch-bot-access-denied-description', interaction.locale);
    const title = getText('watch-watch-bot-access-denied-title', interaction.locale);
    handleBaseEmbed(title, description, false, '#dd3333', true, true);
    return;
  }

  try {
    addThread(thread.id, interaction.guildId, (Date.now() / 1000) + (thread.autoArchiveDuration * 60));

    const description = getText('watch-watch-ok-description', interaction.locale, {
      id: thread.id
    });

    const title = getText('watch-watch-ok-title', interaction.locale);
    handleBaseEmbed(title, description, true, '#00af89', true, false);
  }
  catch (err) {
    console.error(err);
    const description = getText('error-occurred', interaction.locale);
    const title = getText('watch-watch-error', interaction.locale);
    handleBaseEmbed(title, description, false, '#dd3333', true, false);
  }
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
