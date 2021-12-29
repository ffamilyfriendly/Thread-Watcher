const channels = require('../index').channels,
  { addThread, removeThread } = require('./utils/threadActions'),
  { Permissions, CommandInteraction } = require('discord.js');

/**
 * 
 * @param {*} client 
 * @param {CommandInteraction} interaction 
 * @param {*} respond 
 * @returns 
 */
const run = (client, interaction, respond) => {
  const thread = interaction.options.getChannel("channel")

  if (channels.has(thread.id)) {
    try {
      removeThread(thread.id, 'channels');
      respond('👌 Done', `bot will no longer keep all threads in <#${thread.id}> un-archived`);
    }
    catch(err) {
      respond('❌ Issue', 'Bot failed to remove channel from database. Sorry about that', '#ff0000', true);
    }
  }
  else {
    try {
      addThread(thread.id, thread.guildId, 'channels');
      respond('👌 Done', `Bot will make sure all threads in <#${thread.id}> are un-archived`);
    }
    catch(err) {
      console.error(err);
      respond('❌ Issue', 'Bot failed to add channel to watchlist. Sorry about that', '#ff0000', true);
    }
  }
};

module.exports = { run };
