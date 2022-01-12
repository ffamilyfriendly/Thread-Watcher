const threads = require('../index').threads,
  { addThread, removeThread } = require('./utils/threadActions'),
  { CommandInteraction } = require('discord.js');

/**
 * 
 * @param {*} client 
 * @param {CommandInteraction} interaction 
 * @param {*} respond 
 */
const run = (client, interaction, respond) => {
  const thread = interaction.options.getChannel("thread")

  if (threads.has(thread.id)) {
    try {
      removeThread(thread.id);
      respond('👌 Done', `bot will no longer keep <#${thread.id}> un-archived`);
    }
    catch(err) {
      respond('❌ Issue', 'Bot failed to remove thread from database. Sorry about that', '#ff0000', true);
    }
  }
  else {
    try {
      addThread(thread.id, interaction.guildId);
      respond('👌 Done', `Bot will make sure <#${thread.id}> is un-archived`);
    }
    catch(err) {
      console.error(err);
      respond('❌ Issue', 'Bot failed to add thread to watchlist. Sorry about that', '#ff0000', true);
    }
  }
};

const data = {
  name:"watch",
  description: "toggles auto-unarchive on this thread",
  options: [
      {
          name: "thread",
          description: "Thread to toggle auto-unarchive on",
          required: true,
          type: 7,
          channel_types: [10, 11, 12]
      }
  ]
}

module.exports = { run, data };
