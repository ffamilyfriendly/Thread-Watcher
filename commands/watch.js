const threads = require('../index').threads,
  { addThread, removeThread } = require('./utils/threadActions');

const run = (client, data, respond) => {
  const permissions = data.member.permissions;

  // Manage Channels or Manage Server
  if (permissions & (1 << 4) === (1 << 4) || permissions & (1 << 5) === (1 << 5)) {
    respond('You do not have permission to use /watch command.', 'You need Manage Channels or Manage Server permission to use it.', '#ff0000', true);
  }

  const thread = data.data.resolved.channels[Object.keys(data.data.resolved.channels)[0]];

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
      addThread(thread.id, data.guild_id);
      respond('👌 Done', `Bot will make sure <#${thread.id}> is un-archived`);
    }
    catch(err) {
      console.error(err);
      respond('❌ Issue', 'Bot failed to add thread to watchlist. Sorry about that', '#ff0000', true);
    }
  }
};

module.exports = { run };
