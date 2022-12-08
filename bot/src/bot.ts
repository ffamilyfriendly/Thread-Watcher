import { Client, GatewayIntentBits } from "discord.js"
import config from "./config"
import Log75, { LogLevel } from "log75"
import loadEvents from "./utilities/loadEvents"
import loadCommands from "./utilities/loadCommands"
import { getDatabase } from "./utilities/database/DatabaseManager"
import { ReturnData } from "./interfaces/database"
const logger = new Log75(LogLevel.Debug, { color: true })

const db = getDatabase(config.database.type, config.database.options)
db.createTables()

const client = new Client({
    intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers ]
})

loadEvents(client)
const commands = loadCommands()

const threads = new Map<string, ReturnData>();

export { client, logger, commands, db, threads }

client.login(config.tokens.discord)
.catch(err => {
    logger.error(`Could not authorise bot. ${err.toString()}`)
    process.exit(1)
})