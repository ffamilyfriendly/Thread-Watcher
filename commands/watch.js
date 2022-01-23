const threads = require('../index').threads,
  { addThread, removeThread } = require('../utils/threadActions.js'),
  { CommandInteraction } = require('discord.js'),
  getText = require("../utils/getText")

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
      // `getText("watch_off", interaction.locale, { id: thread.id })`
      respond(getText("watch_unwatch", interaction.locale), getText("watch_off", interaction.locale, { id: thread.id }), "RED");
    }
    catch(err) {
      respond(`❌ ${getText("issue", interaction.locale)}`, getText("watch_issue_remove", interaction.locale), '#ff0000', true);
    }
  }
  else {
    try {
      addThread(thread.id, interaction.guildId);
      respond(getText("watch_watch", interaction.locale), getText("watch_on", interaction.locale, { id: thread.id }));
    }
    catch(err) {
      console.error(err);
      respond(`❌ ${getText("issue", interaction.locale)}`, getText("watch_issue_add", interaction.locale), '#ff0000', true);
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
