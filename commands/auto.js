const channels = require('../index').channels,
  getText = require('../utils/getText'),
  { addThread, removeThread } = require('../utils/threadActions'),
  { CommandInteraction, Permissions } = require('discord.js');

/**
 * @param {*} client
 * @param {CommandInteraction} interaction
 * @param {function} handleBaseEmbed
 */
const run = (client, interaction, handleBaseEmbed) => {
  const channel = interaction.options.getChannel('channel') ?? interaction.channel;

  if (channel.isThread()) {
    const description = getText('auto-channel-type-not-allowed');
    const title = getText('channel-type-not-allowed');
    handleBaseEmbed(title, description, false, '#dd3333', true, true);
    return;
  }

  if (!interaction.member.permissionsIn(channel).has([
    Permissions.FLAGS.MANAGE_THREADS,
    Permissions.FLAGS.VIEW_CHANNEL
  ])) {
    const description = getText('auto-user-access-denied', interaction.locale);
    const title = getText('user-access-denied', interaction.locale);
    handleBaseEmbed(title, description, false, '#dd3333', true, true);
    return;
  }

  if (channels.has(channel.id)) {
    try {
      removeThread(channel.id, 'channels');

      const description = getText('auto-unregister-ok-description', interaction.locale, {
        channel: channel.toString()
      });

      const title = getText('auto-unregister-ok-title', interaction.locale);
      handleBaseEmbed(title, description, true, '#dd3333', true, false);
    }
    catch (err) {
      console.error(err);
      const description = getText('unknown-error-occurred', interaction.locale);
      const title = getText('auto-unregister-error', interaction.locale);
      handleBaseEmbed(title, description, false, '#dd3333', true, true);
    }

    return;
  }

  if (!(channel.viewable && interaction.guild.me.permissionsIn(channel).has(Permissions.FLAGS.SEND_MESSAGES_IN_THREADS))) {
    const description = getText('auto-register-bot-access-denied-description', interaction.locale);
    const title = getText('auto-register-bot-access-denied-title', interaction.locale);
    handleBaseEmbed(title, description, false, '#dd3333', true, true);
    return;
  }

  try {
    addThread(channel.id, interaction.guildId, 'channels');

    const description = getText('auto-register-ok-description', interaction.locale, {
      channel: channel.toString()
    });

    const title = getText('auto-register-ok-title', interaction.locale);
    handleBaseEmbed(title, description, true, '#00af89', true, false);
  }
  catch (err) {
    console.error(err);
    const description = getText('unknown-error-occurred', interaction.locale);
    const title = getText('auto-register-error', interaction.locale);
    handleBaseEmbed(title, description, false, '#dd3333', true, true);
  }
};

const data = {
  description: 'Register or unregister a channel to automatically watch new threads in it.',
  name: 'auto',
  options: [
    {
      channel_types: [0, 5],
      description: 'Channel to register or unregister',
      name: 'channel',
      type: 7
    }
  ]
};

module.exports = { run, data };
