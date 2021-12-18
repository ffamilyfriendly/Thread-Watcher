const { threads } = require('../index'),
  { addThread, removeThread } = require('./utils/threadActions');

/**
 * 
 * @param {Discord.TextChannel} channel 
 * @param {string} action 
 * @param {RegExp} pattern 
 */
const batchInChannel = async (channel, action, pattern = null ) => {
  if (!(channel.guild.me.permissionsIn(channel).has('MANAGE_THREADS') && channel.guild.me.permissionsIn(channel).has('VIEW_CHANNEL'))) {
    return {
      succeeded: 0,
      failed: 1
    };
  }

  // make sure all threads are in cache
  await channel.threads.fetchActive();
  await channel.threads.fetchArchived();

  return new Promise((resolve, reject) => {
    let rv = {
      succeeded: 0,
      failed: 0
    };

    const [ reg, blacklist ] = pattern;

    channel.threads.cache.each(t => {
      try {
        const name = t.name;
        const id = t.id;

        if (t.parentId !== channel.id || (threads.has(id) && action === 'watch') || reg ? (blacklist ? name.match(reg) : !name.match(reg)) : false) {
          return;
        }

        if (action === 'watch') {
          addThread(id, channel.guildId);

          if (t.archived) {
            t.setArchived(false, 'automatic');
          }
        }
        else {
          removeThread(id);
        }

        rv.succeeded++;
      }
      catch(err) {
        rv.failed++;
      }
    });

    resolve(rv);
  });
};

const run = async (client, data, respond) => {
  const permissions = data.member.permissions;

  // Manage Channels or Manage Server
  if (!(permissions & (1 << 4) === (1 << 4) || permissions & (1 << 5) === (1 << 5))) {
    respond('You do not have permission to use /batch command.', 'You need Manage Channels or Manage Server permission to use it.', '#ff0000', true);
    return;
  }

  const parent = data.data.resolved.channels[Object.keys(data.data.resolved.channels)[0]];

  let [ action, _p, pattern ] = data.data.options.map(o => o.value);
  const pChannel = client.channels.cache.get(_p);
  let blacklist = false;

  if (pattern?.startsWith('!')) {
    blacklist = true;
    pattern = pattern.substr(1);
  }

  if (pattern) {
    if (pattern.match(/^[a-zA-Z0-9_\*!]{0,100}$/gm)) {
      pattern = RegExp(pattern.replace('*', '\\w*'));
    }
    else {
      respond('❌ Issue', `your pattern "${pattern}" includes forbidden characters`, '#ff0000', true);
      return;
    }
  }

  let actions = {
    succeeded: 0,
    failed: 0
  };

  if (pChannel.type === 'GUILD_CATEGORY') {
    for (let [key, child] of pChannel.children) {
      const a = await batchInChannel(child, action, [ pattern, blacklist ]);
      actions.succeeded += a.succeeded;
      actions.failed += a.failed;
    }
  }
  else {
    actions = await batchInChannel(pChannel, action, [ pattern, blacklist ]);
  }

  respond('👌 Done', `🟢 ${actions.succeeded} succeeded. 🔴 ${actions.failed} failed`);
};

module.exports = { run };
