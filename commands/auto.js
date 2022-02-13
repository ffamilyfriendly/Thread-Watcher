const channels = require('../index').channels,
  getText = require('../utils/getText'),
  { addThread, removeThread } = require('../utils/threadActions'),
  { CommandInteraction, Permissions } = require('discord.js');

/**
 * 
 * @param {*} client 
 * @param {CommandInteraction} interaction 
 * @param {*} respond 
 * @returns 
 */
const run = (client, interaction, getBaseEmbed) => {
  const channel = interaction.options.getChannel('channel');
  let color = '#dd3333';
  let description;
  let ephemeral = true;
  let title;

  if (!interaction.member.permissionsIn(channel).has(Permissions.FLAGS.MANAGE_THREADS)) {
    description = getText('auto-user-access-denied', interaction.locale);
    title = getText('user-access-denied', interaction.locale);
  }
  else if (channels.has(channel.id)) {
    try {
      removeThread(channel.id, 'channels');

      description =  getText('auto-unregister-ok-description', interaction.locale, {
        id: channel.id
      });

      ephemeral = false;
      title = getText('auto-unregister-ok-title', interaction.locale);
    }
    catch (err) {
      console.error(err);
      description = getText('error-occurred', interaction.locale);
      title = getText('auto-unregister-error', interaction.locale);
    }
  }
  else if (interaction.guild.me.permissionsIn(channel).has(Permissions.FLAGS.SEND_MESSAGES_IN_THREADS)) {
    try {
      addThread(channel.id, interaction.guildId, 'channels');
      color = '#00af89';

      description =  getText('auto-register-ok-description', interaction.locale, {
        id: channel.id
      });

      ephemeral = false;
      title = getText('auto-register-ok-title', interaction.locale);
    }
    catch (err) {
      console.error(err);
      description = getText('error-occurred', interaction.locale);
      title = getText('auto-register-error', interaction.locale);
    }
  }
  else {
    description = getText('auto-register-bot-access-denied-description', interaction.locale);
    title = getText('auto-register-bot-access-denied-title', interaction.locale);
  }

  const embed = getBaseEmbed(title, description, !ephemeral);
  embed.setColor(color);

  interaction.reply({
    embeds: [ embed ],
    ephemeral: ephemeral
  });
};

const data = {
  description: 'Register or unregister a channel to automatically watch new threads in it.',
  name: 'auto',
  options: [
    {
      channel_types: [0, 5],
      description: 'Channel to register or unregister',
      name: 'channel',
      required: true,
      type: 7
    }
  ]
};

module.exports = { run, data };