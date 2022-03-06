const Discord = require("discord.js"),
    config = require("./config"),
    client = new Discord.Client({ intents: Discord.Intents.FLAGS.GUILDS }),
    { AutoPoster } = require("topgg-autoposter"),
    fs = require("fs"),
    db = require("./utils/db/getDatabase")(config.database.connectionOptions),
    getText = require("./utils/getText.js"),
    { logger } = require("./utils/clog")

if(config.topggToken) AutoPoster(config.topggToken, client)

let threads = new Map()
let channels = new Map()

/**
 * 
 * @param {Map} map 
 */
const asMap = ( data ) => {
    const m = new Map()
    for(let thing of data)
        m.set(thing.id, { threadID: thing.id, serverID: thing.server })
    return m
}

const init = async () => {

    // wait for the required tables to be created
    await db.createTables()

    // propogate threads map & channels map with their items 
    asMap(await db.getThreads()).forEach((v, k) => threads.set(k, v))
    asMap(await db.getChannels()).forEach((v, k) => channels.set(k, v))

    // this is lazy, but should work
    // makes sure command is only registered once
    if(fs.existsSync("./.commands")) return

    logger.info(`\nFirst time running Thread-Watcher?\n\nHello! I hope you will enjoy this bot and that it will help you and your server :)\nif you need any help with self hosting head on over to the discord\n\nGithub: https://github.com/ffamilyfriendly/Thread-Watcher/\nDiscord: discord.gg/793fagUfmr\nWebsite: familyfriendly.xyz/thread\n`)

    logger.info("Registering commands")
    for(let command of client.commands) {
      try {
        command = command[1]
        if(command.allowedGuild) {
          if(!client.guilds.cache.has(command.allowedGuild)) {
            logger.warn(`command ${command.data.name} could not be registered. Make sure that "allowedGuild" is a guild your bot is in`)
            continue;
          }
          client.api.applications(client.user.id).guilds(command.allowedGuild).commands.post({ data: command.data })
        }
        else client.api.applications(client.user.id).commands.post({ data: command.data })
        logger.done(`Registered ${command.data.name}!`)
      } catch(err) {
        logger.error(`failed to register ${command[1].data.name}`)
        console.error(err)
      }
    }

    // write file keeping command from being registered every time bot starts
    fs.writeFileSync("./.commands","command have been added")
}

const loadCommands = (clearcache) => {
    if(clearcache) {
        for(let cmd of client.commands) {
            cmd = cmd[0]
            delete require.cache[require.resolve(`./commands/${cmd}.js`)]
        }
    }
    client.commands = new Map(fs.readdirSync("./commands").filter(f => f.endsWith(".js")).map(f => [f.split(".js")[0],require(`./commands/${f}`)]))
}

module.exports = { db, client, loadCommands, threads, channels };

loadCommands()

const { removeThread, addThread, removeAllFromGuild } = require("./utils/threadActions.js")

const checkAll = require("./routines/checkAllThreads").run

client.on('interactionCreate', (interaction) => {
  const handleBaseEmbed = (title, description, show_user, color, respond, ephemeral) => {
    const embed = new Discord.MessageEmbed();
    embed.setTitle(title);
    embed.setDescription(description);

    if (show_user) {
      embed.setAuthor({
        iconURL: interaction.user.displayAvatarURL(),
        name: (interaction.member.nickname === null) ? interaction.user.tag : `${interaction.member.nickname} (${interaction.user.tag})`
      });
    }

    embed.setFooter({
      iconURL: client.user.displayAvatarURL(),
      text: client.user.username
    });

    embed.setTimestamp();
    embed.setColor(color);

    if (respond) {
      if (interaction.deferred) {
        interaction.editReply({
          embeds: [embed]
        });
      }
      else {
        interaction.reply({
          embeds: [embed],
          ephemeral: ephemeral
        });
      }
    }

    return embed;
  };

  if (!interaction.isCommand()) {
    return;
  }

  if (!client.commands.has(interaction.commandName)) {
    const description = getText('command-not-properly-registered', interaction.locale, {
      command: `/${interaction.commandName}`
    });

    const title = getText('interaction-error', interaction.locale);
    handleBaseEmbed(title, description, false, '#dd3333', true, true);
    return;
  }

  const cmd = client.commands.get(interaction.commandName);

  try {
    cmd.run(client, interaction, handleBaseEmbed);
  }
  catch (err) {
    logger.warn(JSON.stringify(err));
    const description = getText('unknown-error-occurred', interaction.locale);
    const title = getText('interaction-error', interaction.locale);
    handleBaseEmbed(title, description, false, '#dd3333', true, true);
  }
});

client.on("ready", async () => {
    await init()
    checkAll(asMap(await db.getArchivedThreads()))
    logger.done(`Bot running on ${client.guilds.cache.size} guilds and keeping ${threads.size} threads active.`)

    // set status every hour as it seems to go away after a while
    client.user.setPresence({ activities: [{ name: 'with 🧵 | familyfriendly.xyz/thread', type: "PLAYING" }], status: 'online' });
    setInterval(() => { client.user.setPresence({ activities: [{ name: 'with 🧵 | familyfriendly.xyz/thread', type: "PLAYING" }], status: 'online' }); }, 1000 * 60 * 60)
})

// We had to implement ratelimit and blacklist since there are some cunts DOSing the bot.
// Server will added to the blacklist for a while when they go over ratelimit.
const blacklist = [];
const ratelimits = {};

const getDate = () => {
  return (new Date()).toLocaleString(undefined, {
    hour12: false
  });
};

client.on('threadUpdate', (oldThread, newThread) => {
  if (oldThread.archived || !newThread.archived || blacklist.includes(newThread.guildId) || !threads.has(newThread.id)) {
    return;
  }

  if (newThread.guildId in ratelimits && ratelimits[newThread.guildId] >= 10) {
    blacklist.push(newThread.guildId);

    let mentions = '';

    for (const owner of config.owners) {
      mentions += `<@${owner}> `;
    }

    client.channels.cache.get('884845608349868052').send(`${mentions}\`${newThread.guildId}\` server went over ratelimit!`);

    setTimeout(() => {
      blacklist = blacklist.filter(s => s != newThread.guildId);
    }, 1000 * 60 * 30);

    return;
  }

  // Workaround for discordjs/discord.js#7406: This should be !newThread.unarchivable && newThread.locked once discord.js v14 is released.
  if (!newThread.sendable || newThread.locked) {
    logger.warn(`[auto] (${getDate()}) Skipped ${newThread.id} thread in ${newThread.guildId} server. (archived: ${newThread.archived}, locked: ${newThread.locked}, sendable: ${newThread.sendable})`);
    return;
  }

  const unarchive_reason = getText('unarchive-reason-keep-active', newThread.guild.preferredLocale);
  newThread.setArchived(false, unarchive_reason);
  logger.done(`[auto] (${getDate()}) Unarchived ${newThread.id} thread in ${newThread.guildId} server.`);
  db.updateArchiveTimes(newThread.id, (Date.now() / 1000) + (newThread.autoArchiveDuration * 60));
  ratelimits[newThread.guildId] = (newThread.guildId in ratelimits) ? (ratelimits[newThread.guildId] + 1) : 1;

  setTimeout(() => {
    ratelimits[oldThread.guildId]--;
  }, 1000 * 60);
});

// when a thread is removed, delete it from the database
client.on("threadDelete", (thread) => {
    removeThread(thread.id)
})

// add threads made in selected channels to watchlist
client.on("threadCreate", (thread) => {
    if(channels.has(thread.parentId)) addThread(thread.id, thread.guildId, (Date.now() / 1000) + (thread.autoArchiveDuration * 60))
})

// Remove all db items linked to a guild the bot left
client.on("guildDelete", (guild) => {
  logger.info(`left guild ${guild.name} (${guild.id}). Removing associated entries`)
  removeAllFromGuild(guild.id)
})

client.login(config.token)

if(config.stats.enabled) {
    const http = require("http")
    const reqListener = (req,res) => {
        if(!req.url || !req.url.endsWith("/stats")) {
            res.writeHead(404)
            return res.end("the only path is /stats... how did you manage to mess that up?")
        }
        res.writeHead(200)
        res.end(JSON.stringify({
            guilds: client.guilds.cache.size,
            threads: threads.size
        }))
    }
    
    const server = http.createServer(reqListener)
    server.listen(config.stats.port)
}
