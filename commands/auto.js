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
const run = (client, interaction, respond, l) => {
  const thread = interaction.options.getChannel("channel")

  if (channels.has(thread.id)) {
    try {
      removeThread(thread.id, 'channels');
      respond(`👌 ${l("done")}`, l("watch_off", { id: thread.id }));
    }
    catch(err) {
      respond(`❌ ${l("issue")}`, l("watch_issue_remove"), '#ff0000', true);
    }
  }
  else {
    try {
      addThread(thread.id, thread.guildId, 'channels');
      respond(`👌 ${l("done")}`, l("watch_on", { id: thread.id }));
    }
    catch(err) {
      console.error(err);
      respond(`❌ ${l("issue")}`, l("watch_issue_add"), '#ff0000', true);
    }
  }
};

const data = {
  name:"auto",
  description: "automatically watch all threads made in a selected channel",
  options: [
      {
          name: "channel",
          description: "the channel to toggle",
          required: true,
          type: 7,
          channel_types: [0, 5]
      }
  ]
}

module.exports = { run, data };
