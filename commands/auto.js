const channels = require('../index').channels,
  { addThread, removeThread } = require('./utils/threadActions'),
  { Permissions } = require('discord.js');

const run = (client, data, respond) => {
  const user_permissions = new Permissions(BigInt(data.member.permissions));

  if (!user_permissions.has(Permissions.FLAGS.MANAGE_THREADS)) {
    respond('You do not have permission to use /auto command.', 'You need Manage Threads permission to use it.', '#ff0000', true);
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
