const Discord = require("discord.js"),
    config = require("./config"),
    client = new Discord.Client({ intents: Discord.Intents.FLAGS.GUILDS }),
    fs = require("fs"),
    sql = require("better-sqlite3"),
    db = sql("./data.db")

let threads = new Map()

const getThreads = (map) => {
    const data = db.prepare("SELECT * FROM threads").all()
    for(thread in data) {
        const t = data[thread]
        map.set(t.id, { threadID: t.id, serverID: t.server })
    }
}

const init = () => {

    // create table where thread id is primary key and server id is a property.
    db.prepare("CREATE TABLE IF NOT EXISTS threads (id TEXT PRIMARY KEY, server TEXT)").run()
    getThreads(threads)

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

const checkIfBotCanManageThread = (sid) => {
    return client.guilds.cache.get(sid)?.me.permissions.has("MANAGE_THREADS")
}

module.exports = { db, client, threads, checkIfBotCanManageThread }
const commands = new Map(fs.readdirSync("./commands").filter(f => f.endsWith(".js")).map(f => [f.split(".js")[0],require(`./commands/${f}`)]))
const { removeThread } = require("./commands/utils/threadActions")

const checkAll = require("./routines/checkAllThreads").run

client.on("ready", () => {
    init()
    checkAll(threads)
    console.log(`Bot running on ${client.guilds.cache.size} guilds and keeping ${threads.size} threads active.`)
    
    client.user.setPresence({ activities: [{ name: 'with 🧵 | familyfriendly.xyz/thread', type: "PLAYING" }], status: 'online' });

    

    client.ws.on("INTERACTION_CREATE", async data => {
        const respond = (title,content, color = "#008000", private = false) => {
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
                        embeds: [embed],
                        flags: private ? 1 << 6 : 0
                    }
                }
            })
        }
        // check if user has perms
        const hasPerms = ((data.member.permissions & 0x0400000000) === 0x0400000000) ||((data.member.permissions & (1 << 4)) === (1 << 4)) || ((data.member.permissions & (1 << 13)) === (1 << 13)) || ((data.member.permissions & 0x0000000008) === 0x0000000008)
        if(!hasPerms) return respond("❌ Permissions", "you need to have either administrator, manage channels, or manage messages permissions to run this command. Sorry!", "#ff0000", true)

        if(!checkIfBotCanManageThread(data.guild_id)) return respond("❌ Issue", "bot requires manage threads permission to function!", "#ff0000")

        if(!commands.has(data.data.name)) return respond("❌ Issue", "bot does not have that command registered. Contact bot host", "#ff0000", true)
        const cmd = commands.get(data.data.name)
        
        try {
            cmd.run(client, data, respond)
        } catch(err) {
            console.warn(err)
            respond("❌ Internal error", "something went wrong that probably wasnt your fault", "#ff0000")
        }
    })
})

client.on("threadUpdate", (oldThread, newThread) => {
    if(!threads.has(newThread.id)) return
    if((newThread.archived || newThread.archiveTimestamp < Date.now() / 1000) && checkIfBotCanManageThread(newThread.guildId)) newThread.setArchived(false, "automatic")
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

