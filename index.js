const Discord = require("discord.js"),
    config = require("./config"),
    client = new Discord.Client({ intents: Discord.Intents.FLAGS.GUILDS }),
    { AutoPoster } = require("topgg-autoposter"),
    fs = require("fs"),
    db = require("./utils/db/getDatabase")(config.database.connectionOptions)

if(config.topggToken) AutoPoster(config.topggToken, client)

let threads = new Map()
let channels = new Map()

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

// load all commands. This adds them to the client.commands map
loadCommands()

// this runs all event modules. Check /events dir
require("./utils/events")().forEach(event => event.run( client ))

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
