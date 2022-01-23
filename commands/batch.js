const { threads } = require('../index'),
  { addThread, removeThread } = require('../utils/threadActions.js'),
  { CommandInteraction, TextChannel } = require('discord.js');

/**
 * 
 * @param {TextChannel} channel 
 * @param {string} action 
 * @param {RegExp} pattern 
 */
const batchInChannel = async (channel, action, pattern = null ) => {
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
        if(!t.manageable) {
          rv.failed++
        } else {
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
      }
      catch(err) {
        rv.failed++;
      }
    });

    resolve(rv);
  });
};

/**
 * 
 * @param {*} client 
 * @param {CommandInteraction} interaction 
 * @param {*} respond 
 * @returns 
 */
const run = async (client, interaction, respond, l) => {
  const action = interaction.options.getString("action")
  const parent = interaction.options.getChannel("parent")
  const pattern = interaction.options.getString("pattern")
  let blacklist = false;

  if (pattern?.startsWith('!')) {
    blacklist = true;
    pattern = pattern.substring(1);
  }

  if (pattern) {
    if (pattern.match(/^[a-zA-Z0-9_\*!]{0,100}$/gm)) {
      pattern = RegExp(pattern.replace('*', '\\w*'));
    }
    else {
      respond('❌ Issue', l("batch_forbidden_characters", { pattern }), '#ff0000', true);
      return;
    }
  }

  let actions = {
    succeeded: 0,
    failed: 0
  };


  // I apologise to the brave soul reading thread watchers code. This is horrible but it works
  const doBatchThing = () => {
    return new Promise(async (resolve, reject) => {
      if (parent.type === 'GUILD_CATEGORY') {

        for(const _channel of Array.from(parent.children)) {
          const channel = _channel[1]
          if(channel.viewable) {
            const a = await batchInChannel(channel, action, [ pattern, blacklist ])
            actions.succeeded += a.succeeded
            actions.failed += a.failed;
          }
        }
        resolve()
      }
      else {
        let a = await batchInChannel(parent, action, [ pattern, blacklist ])
        actions = a
        resolve()
      }

      
    })
  }

  interaction.deferReply()
  .then(_d => {
    doBatchThing()
    .then(_res => {
      //`🟢 ${actions.succeeded} succeeded. 🔴 ${actions.failed} failed`
      respond(`👌 ${l("done")}`, l("batch_result", { succeeded: actions.succeeded, failed: actions.failed }), '#008000');
    })
  })
};

const data = {
  name:"batch",
  description: "batch add/remove threads to watch",
  options: [
      {
          name: "action",
          description: "what action to apply to the threads",
          required: true,
          type: 3,
          choices: [
              {
                  name: "watch",
                  value: "watch"
              },
              {
                  name: "un-watch",
                  value: "unwatch"
              }
          ]
      },
      {
          name: "parent",
          description: "The parent channel or category whose threads you want to apply an action to",
          type: 7,
          required: true,
          channel_types: [0, 4, 5]
      },
      {
          name: "pattern",
          description: "specify which channels by name to apply an action to. Check website for more info",
          type: 3
      }
  ]
}

module.exports = { run, data };
