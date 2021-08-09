const Discord = require("discord.js"),
    config = require("./config"),
    client = new Discord.Client(),
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
        console.log(t)
    }

    return _t
}

let threads = new Map()



const init = () => {

    // create table where thread id is primary key and server id is a property.
    db.prepare("CREATE TABLE IF NOT EXISTS threads (id TEXT PRIMARY KEY, server TEXT)").run()
    threads = getThreads()


    // this is lazy, but should work
    // makes sure command is only registered once
    if(fs.existsSync("./.commands")) return

    client.api.applications(client.user.id).guilds("687411800261918892").commands.post({
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

    // write file keeping command from being registered every time bot starts
    fs.writeFileSync("./.commands","command have been added")
}

const unArchive = (id) => {
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
    }).then(res => res.json())
    .then(json => {
        console.log(json)
    })
}

const checkThread = (id) => {
    fetch(`https://discord.com/api/v9/channels/${id}`,{
        headers: [
            ["Authorization", `Bot ${config.token}`],
            ["User-Agent", "DiscordBot (discord.js,@latest)"]
        ],
        method: "GET"
    }).then(res => res.json())
    .then(thread => {
        if(thread.thread_metadata.archived) unArchive(id)
    })
}

client.on("ready", () => {
    init()
    console.log(`Bot running on ${client.guilds.cache.size} guilds and keeping ${threads.size} threads active.`)
    threads.forEach(t => {
        checkThread(t.threadID)
    })
    // test
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

        const thread = data.data.resolved.channels[Object.keys(data.data.resolved.channels)[0]]
        if(thread.type != 11) return respond("❌ Issue", "The attatched channel is not a thread.", "#ff0000")
        if(threads.has(thread.id)) { 
            try {
                db.prepare("DELETE FROM threads WHERE id = ?").run(thread.id)
                threads.delete(thread.id)
                respond("👌 Done", `bot will no longer keep <#${thread.id}> un-archived`)
            } catch(err) {
                respond("❌ Issue", "Bot failed to remove thread from database. Sorry about that")
            }
        } else {
            try {
                db.prepare("INSERT INTO threads VALUES(?,?)").run(thread.id,data.guild_id)
                threads.set(thread.id, { threadID: thread.id, serverID: data.guild_id })
                respond("👌 Done", `Bot will make sure <#${thread.id}> is un-archived`)
            } catch(err) {
                respond("❌ Issue", "Bot failed to add thread to watchlist. Sorry about that")
            }
        }
    })
    
    client.ws.on("THREAD_UPDATE", async data => {
        console.log(data)
    })
    
    client.ws.on("THREAD_CREATE", async data => {
        console.log(data)
    })
})

client.login(config.token)
//test
