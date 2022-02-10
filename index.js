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

const checkIfBotCanManageThread = (sid, cid) => {
    const guild = client.guilds.cache.get(sid)
    if(!guild) return false
    return guild.channels.cache.get(cid)?.permissionsFor(guild.me).has(Discord.Permissions.FLAGS.MANAGE_THREADS)
}

const init = async () => {

    await db.createTables()

    asMap(await db.getThreads()).forEach((v, k) => threads.set(k, v))
    asMap(await db.getChannels()).forEach((v, k) => channels.set(k, v))

    // this is lazy, but should work
    // makes sure command is only registered once
    if(fs.existsSync("./.commands")) return

    for(let command of client.commands) {
        command = command[1]
        if(command.allowedGuild) client.api.applications(client.user.id).guilds(command.allowedGuild).commands.post({ data: command.data })
        else client.api.applications(client.user.id).commands.post({ data: command.data })
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

module.exports = { db, client, checkIfBotCanManageThread, loadCommands, threads, channels }

loadCommands()

const { removeThread, addThread } = require("./utils/threadActions.js")

const checkAll = require("./routines/checkAllThreads").run

client.on("interactionCreate", interaction => {
    if(!interaction.isCommand()) return
    const respond = (title,content, color = "#008000", private = false) => {
        const embed = new Discord.MessageEmbed()
            .setColor(color)
            .setAuthor({ iconURL: interaction.user.displayAvatarURL(), name: interaction.user.tag  })
            .setFooter({ text: "Thread-Watcher", iconURL: client.user.avatarURL() })
            .setTimestamp()
            .addFields({ name: title, value: content })

        if(interaction.deferred) interaction.editReply({ embeds: [embed] })
        else interaction.reply({ embeds: [embed], ephemeral: private })
    }


    if(["auto", "batch", "watch"].includes(interaction.commandName)) {
        if(!checkIfBotCanManageThread(interaction.guildId, interaction.channelId)) return respond(`❌ ${getText("issue", interaction.locale)}`, getText("needs_manage_threads", interaction.locale), "#ff0000")
        else if(!interaction.memberPermissions.has(Discord.Permissions.FLAGS.MANAGE_THREADS)) return respond(getText("no_perms_for_command", interaction.locale, { command: interaction.commandName }), getText("user_needs_manage_threads", interaction.locale), '#ff0000', true);
    } 
    if(!client.commands.has(interaction.commandName)) return respond(`❌ ${getText("issue", interaction.locale)}`, "bot does not have that command registered. Contact bot host", "#ff0000", true)
    
    const l = (label, obj) => {
        return getText(label, interaction.locale, obj)
    }

    const cmd = client.commands.get(interaction.commandName)
    try {
        cmd.run(client, interaction, respond, l)
    } catch(err) {
        logger.warn(JSON.stringify(err))
        respond(`❌ ${getText("issue", interaction.locale)}`, getText("command_broke", interaction.locale), "#ff0000", true)
    }
})

client.on("ready", async () => {
    init()
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
    const now = new Date()
    return `${now.toDateString()} ${now.getHours()}h${now.getMinutes()}m${now.getSeconds()}s`
}

client.on('threadUpdate', (oldThread, newThread) => {
  if (oldThread.archived || !newThread.archived || blacklist.includes(newThread.guildId) || !threads.has(newThread.id)) {
    return;
  }

  if (newThread.guildId in ratelimits && ratelimits[newThread.guildId] >= 10) {
    blacklist.push(newThread.guildId);

    let mentions = '';

    for (const owner in config.owners) {
      mentions += `<@${owner}> `;
    }

    client.channels.cache.get('884845608349868052').send(`${mentions}\`${newThread.guildId}\` server went over ratelimit!`);

    setTimeout(() => {
      blacklist = blacklist.filter(s => s != newThread.guildId);
    }, 1000 * 60 * 30);

    return;
  }

  // Workaround for discordjs/discord.js#7406: This should be !newThread.unarchivable && newThread.locked once discord.js v14 is released.
  if (!checkIfBotCanManageThread(newThread.guildId, newThread.parentId) || newThread.locked) {
    logger.warn(`[auto] (${getDate()}) Skipped ${newThread.id} thread in ${newThread.guildId} server. (archived: ${newThread.archived}, bot has permissions: ${checkIfBotCanManageThread(newThread.guildId, newThread.parentId)})`);
    return;
  }

  newThread.setArchived(false, 'Keeping the thread active');
  logger.done(`[auto] (${getDate()}) Unarchived ${newThread.id} thread in ${newThread.guildId} server.`);
  db.updateArchiveTimes(newThread.id, (Date.now() / 1000) + (newThread.autoArchiveDuration * 60));
  ratelimits[newThread.guildId] = (newThread.guildId in ratelimits) ? (ratelimits[newThread.guildId] + 1) : 1;

  setTimeout(() => {
    ratelimits[oldThread.guildId]--;
  }, 1000 * 60);
});

client.on("threadDelete", (thread) => {
    removeThread(thread.id)
})

client.on("threadCreate", (thread) => {
    if(channels.has(thread.parentId)) addThread(thread.id, thread.guildId, (Date.now() / 1000) + (thread.autoArchiveDuration * 60))
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
