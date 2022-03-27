const { threads, channels, db } = require("../index")
const { logger } = require("../utils/clog")
const fs = require("fs")
const checkAll = require("../routines/checkAllThreads").run
const config = require("../config")

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

const init = async ( client ) => {

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
        if(command.devServerOnly) {
          if(!client.guilds.cache.has(config.devServer)) {
            logger.warn(`command ${command.data.name} could not be registered. Make sure that "config.js:devServer" is a guild your bot is in`)
            continue;
          }
          client.api.applications(client.user.id).guilds(config.devServer).commands.post({ data: command.data })
        }
        else client.api.applications(client.user.id).commands.post({ data: command.data })
        logger.done(`Registered ${command.data.name}!`)
      } catch(err) {
        logger.error(`failed to register ${command.data.name}`)
        console.error(err)
      }
    }

    // write file keeping command from being registered every time bot starts
    fs.writeFileSync("./.commands","command have been added")
}

const run = ( client ) => {
    client.on("ready", async () => {
        await init(client)
        checkAll(asMap(await db.getArchivedThreads()))
        logger.done(`Bot running on ${client.guilds.cache.size} guilds and keeping ${threads.size} threads active.`)
    
        // set status every hour as it seems to go away after a while
        client.user.setPresence({ activities: [{ name: 'with 🧵 | familyfriendly.xyz/thread', type: "PLAYING" }], status: 'online' });
        setInterval(() => { client.user.setPresence({ activities: [{ name: 'with 🧵 | familyfriendly.xyz/thread', type: "PLAYING" }], status: 'online' }); }, 1000 * 60 * 60)
    })
}

module.exports = { run }