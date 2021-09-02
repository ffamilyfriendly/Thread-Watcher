const { match } = require("assert/strict")
const { isFunction } = require("util")

const Discord = require("discord.js"),
    config = require("./config"),
    client = new Discord.Client({ intents: Discord.Intents.FLAGS.GUILDS }),
    fs = require("fs"),
    sql = require("better-sqlite3"),
    db = sql("./data.db"),
    fetch = require("node-fetch")


const getThreads = () => {
    const _t = new Map()
    const data = db.prepare("SELECT * FROM threads").all()

    for(thread in data) {
        const t = data[thread]
        _t.set(t.id, { threadID: t.id, serverID: t.server })
    }

    return _t
}

let threads = new Map()

const addThread = ( threadid, guildid ) => {
    if(threads.has(threadid)) return
    db.prepare("INSERT INTO threads VALUES(?,?)").run(threadid,guildid)
    threads.set(threadid, { threadID: threadid, serverID: guildid })
}

const removeThread = (id) => {
    db.prepare("DELETE FROM threads WHERE id = ?").run(id)
    threads.delete(id)
}

const init = () => {

    // create table where thread id is primary key and server id is a property.
    db.prepare("CREATE TABLE IF NOT EXISTS threads (id TEXT PRIMARY KEY, server TEXT)").run()
    threads = getThreads()


    // this is lazy, but should work
    // makes sure command is only registered once
    if(fs.existsSync("./.commands")) return

    
    client.api.applications(client.user.id).commands.post({
        data: {
            name:"watch",
            description: "toggles auto-unarchive on this thread",
            options: [
                {
                    name: "thread",
                    description: "Thread to toggle auto-unarchive on",
                    required: true,
                    type: 7
                }
            ]
        }
    })

    client.api.applications(client.user.id).commands.post({
        data: {
            name:"threads",
            description: "lists all threads in your server that the bot is watching"
        }
    })

    client.api.applications(client.user.id).commands.post({
        data: {
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
                    required: true
                },
                {
                    name: "pattern",
                    description: "specify which channels by name to apply an action to. Check website for more info",
                    type: 3
                }
            ]
        }
    })

    // write file keeping command from being registered every time bot starts
    fs.writeFileSync("./.commands","command have been added")
}

/*
    Trying to implement ratelimiting.
    we have 3 interesting headers, namely "x-ratelimit-limit", "x-ratelimit-remaining", and "x-ratelimit-reset"
    we need to make sure not to exceed x-ratelimit-limit within the alloted limit set in "x-ratelimit-limit".
    for now it should be fine to just have a queue of sorts with unarchive requests as I do not expect this bot
    to grow too quickly. If I am wrong in this assesment I will suffer in debug hell but it is what it isssssss
*/

let ratelimits = {
    resets: null,
    remaining: 10,
    limit: null
}

const unArchiveRequests = []

const checkIfBotCanManageThread = (sid) => {
    return client.guilds.cache.get(sid)?.me.permissions.has("MANAGE_THREADS")
}

// moved code from unArchive to this function. unArchive now only appends the request to the queue whilst doUnArchhive does the actual reqeust
const doUnArchive = (id) => {
    fetch(`https://discord.com/api/v9/channels/${id}`, {
        headers: [
            ["Authorization", `Bot ${config.token}`],
            ["User-Agent", "DiscordBot (discord.js,@latest)"],
            ["X-Audit-Log-Reason", "(automatic) un-archive"],
            ["Content-Type", "application/json"]
        ],
        method: "PATCH",
        body: JSON.stringify({
            archived: false
        })
    }).then(res =>  {
        if(res?.status == 403) console.warn(`could not un-archive ${id}`)
        ratelimits = {
            resets: res.headers.get('x-ratelimit-reset'),
            remaining: res.headers.get('x-ratelimit-remaining'),
            limit: res.headers.get('x-ratelimit-limit')
        }
    } )
}

const handleQueue = () => {
    const thread = unArchiveRequests.shift()
    if(!thread) return
    if(ratelimits.remaining >= 1) { doUnArchive(thread); handleQueue() }
    else {
        setTimeout(() => {
            doUnArchive(thread)
            handleQueue()
        }, (ratelimits.resets - Date.now() / 1000) + 500)
    }
    console.log(`un-archiving ${thread}`)
}

const unArchive = (id) => {
    unArchiveRequests.push(id)
    if(unArchiveRequests.length === 1) handleQueue()
}

// seems checking threads is fine for the time being, no ratelimits need to be considered
const checkThread = (id) => {
    fetch(`https://discord.com/api/v9/channels/${id}`,{
        headers: [
            ["Authorization", `Bot ${config.token}`],
            ["User-Agent", "DiscordBot (discord.js,@latest)"]
        ],
        method: "GET"
    }).then(res => res.json())
    .then(thread => {
        if(thread.message && (thread?.code == 10003 || thread?.code == 50001)) return removeThread(id)
        if(thread.thread_metadata.archived && checkIfBotCanManageThread(thread.guild_id)) unArchive(id)
    })
}

/**
 * 
 * @param {Discord.TextChannel} channel 
 * @param {string} action 
 * @param {RegExp} pattern 
 */
const batchInChannel = async (channel, action, pattern = null ) => {
    // make sure all threads are in cache
    await channel.threads.fetchActive()
    await channel.threads.fetchArchived()

    const [ reg, blacklist ] = pattern
    channel.threads.cache.each(t => {
        const name = t.name
        const id = t.id
        if(t.parentId != channel.id || ( threads.has(id) && action == "watch" ) || reg ? blacklist ? name.match(reg) : !name.match(reg) : false) return
        action == "watch" ? addThread(id, channel.guildId) : removeThread(id)
    })
}

client.on("ready", () => {
    init()
    console.log(`Bot running on ${client.guilds.cache.size} guilds and keeping ${threads.size} threads active.`)
    
    client.user.setPresence({ activities: [{ name: 'with 🧵 | familyfriendly.xyz/thread', type: "PLAYING" }], status: 'online' });

    threads.forEach(t => {
        checkThread(t.threadID)
    })

    client.ws.on("INTERACTION_CREATE", async data => {
        const respond = (title,content, color = "#008000") => {
            const embed = new Discord.MessageEmbed()
                .setColor(color)
                .setTitle("Thread Watcher")
                .addFields(
                    { name: title, value: content }
                )
                .setFooter('Bot by Family friendly#6191, https://familyfriendly.xyz');
            client.api.interactions(data.id, data.token).callback.post({
                data: {
                    type: 4,
                    data: {
                        embeds: [embed]
                    }
                }
            })
        }

        // check if user has MANAGE_THREADS or ADMINISTRATOR
        const hasPerms = ((data.member.permissions & 0x0400000000) === 0x0400000000) || ((data.member.permissions & 0x0000000008) === 0x0000000008)
        if(!hasPerms) return

        if(!checkIfBotCanManageThread(data.guild_id)) return respond("❌ Issue", "bot requires manage threads permission to function!", "#ff0000")

        // I would write an actual command handler but I cannot be bothered rn
        switch(data.data.name) {
            case "threads":
                let threadsList = db.prepare("SELECT * FROM threads WHERE server = ?").all(data.guild_id)
                respond("Threads the bot is watching", `${threadsList.map(t => `<#${t.id}>`).join(", ")}`.substr(0, 2000) || "no threads are being watched", "#008000")
            break;
            case "watch":
                const thread = data.data.resolved.channels[Object.keys(data.data.resolved.channels)[0]]
                if(thread.type != 11) return respond("❌ Issue", "The attatched channel is not a thread.", "#ff0000")
                if(threads.has(thread.id)) { 
                    try {
                        removeThread(thread.id)
                        respond("👌 Done", `bot will no longer keep <#${thread.id}> un-archived`)
                    } catch(err) {
                        respond("❌ Issue", "Bot failed to remove thread from database. Sorry about that")
                    }
                } else {
                    try {
                        addThread(thread.id, data.guild_id)
                        respond("👌 Done", `Bot will make sure <#${thread.id}> is un-archived`)
                    } catch(err) {
                        respond("❌ Issue", "Bot failed to add thread to watchlist. Sorry about that")
                    }
                }
            break;
            case "batch":
                const parent = data.data.resolved.channels[Object.keys(data.data.resolved.channels)[0]]
                if([11, 12, 13, 6, 2, 1].includes(parent.type)) return respond("❌ Issue", "that channel type cannot hold threads", "#ff0000")
                let [ action, _p, pattern ] = data.data.options.map(o => o.value)
                const pChannel = client.channels.cache.get(_p)
                let blacklist = false
                if(pattern?.startsWith("!")) { blacklist = true; pattern = pattern.substr(1) }
                if(pattern) {
                    if(pattern.match(/^[a-zA-Z0-9_\*!]{0,100}$/gm)) pattern = RegExp(pattern.replace("*", "\\w*"))
                    else return respond("❌ Issue", `your pattern "${pattern}" includes forbidden characters`)
                }

                if(pChannel.type == "GUILD_CATEGORY") {
                    pChannel.children.forEach( child => batchInChannel(child, action, [ pattern, blacklist ]))
                } else batchInChannel(pChannel, action, [ pattern, blacklist ])
                respond("👌 Done", "bot used batch action")
            break;
        }
    })
})

client.on("threadUpdate", (oldThread, newThread) => {
    if(!threads.has(newThread.id)) return
    if((newThread.archived || newThread.archiveTimestamp < Date.now() / 1000) && checkIfBotCanManageThread(newThread.guildId)) checkThread(newThread.id)
})

client.on("threadDelete", (thread) => {
    removeThread(thread.id)
})

client.login(config.token)

if(config.stats && config.stats.enabled) {
    // bot stats
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

