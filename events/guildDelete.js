const { removeAllFromGuild } = require("../utils/threadActions")
const { logger } = require("../utils/clog")

const run = ( client ) => {
    client.on("guildDelete", (guild) => {
        logger.info(`left guild ${guild.name} (${guild.id}). Removing associated entries`)
        removeAllFromGuild(guild.id)
    })
}

module.exports = { run }