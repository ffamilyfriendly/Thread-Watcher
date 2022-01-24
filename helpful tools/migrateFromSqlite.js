const conf = require("../config"),
    mysql = new (require("../utils/db/mysql.js"))(conf.database.connectionOptions),
    sqlite = new (require("../utils/db/sqlite.js"))

const { default: Log75, LogLevel } = require("log75")
const logger = new Log75(LogLevel.Debug, { color: true })

logger.info("migrating from sqlite to mysql. Remember to place the data.db file in this directory")

const migrateThreads = async () => {
    logger.info("migrating threads")
    const threads = await sqlite.getThreads()
    for(let thread of threads)
        mysql.insertThread(thread.id, thread.server)
}

const migrateChannels = async () => {
    logger.info("migrating channels")
    const channels = await sqlite.getChannels()
    for(let channel of channels)
        mysql.insertChannel(channel.id, channel.server)
}

const doThings = async () => {
    await mysql.createTables()
    try {
        await migrateChannels()
    } catch(err) {
        logger.warn("err in migrate channels")
    }
    try {
        await migrateThreads()
    } catch(err) {
        logger.warn("err in migrate threads")
    }

    logger.done("migrated")
}

doThings()