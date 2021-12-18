const channels = require('../index').channels,
  { addThread, removeThread } = require('./utils/threadActions');

const run = (client, data, respond) => {
  const permissions = data.member.permissions;

  // Manage Channels or Manage Server
  if (permissions & (1 << 4) === (1 << 4) || permissions & (1 << 5) === (1 << 5)) {
    respond('You do not have permission to use /auto command.', 'You need Manage Channels or Manage Server permission to use it.', '#ff0000', true);
    return;
  }

  const thread = data.data.resolved.channels[Object.keys(data.data.resolved.channels)[0]];

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
      addThread(thread.id, data.guild_id, 'channels');
      respond('👌 Done', `Bot will make sure all threads in <#${thread.id}> are un-archived`);
    }
    catch(err) {
      console.error(err);
      respond('❌ Issue', 'Bot failed to add channel to watchlist. Sorry about that', '#ff0000', true);
    }
  }
};

module.exports = { run };
