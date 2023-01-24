import { Client, GatewayIntentBits } from "discord.js"
import config from "./config"
import Log75, { LogLevel } from "log75"
import loadEvents from "./utilities/loadEvents"
import loadCommands from "./utilities/loadCommands"
import { getDatabase } from "./utilities/database/DatabaseManager"
import registerCommands from "./utilities/registerCommands";
import { ReturnData } from "./interfaces/database"
const logger = new Log75(LogLevel.Debug, { color: true })

const db = getDatabase(config.database.type)
db.createTables()

const client = new Client({
    intents: [ GatewayIntentBits.Guilds ]
})

loadEvents(client)
const commands = loadCommands()

const threads = new Map<string, ReturnData>();

// reg commands

const args = process.argv
if(args.includes("-reg_commands")) {
    registerCommands(!args.includes("-local"))
}

export { client, logger, commands, db, threads }

client.login(config.tokens.discord)
.catch(err => {
    logger.error(`Could not authorise bot. ${err.toString()}`)
    process.exit(1)
})

process.on("uncaughtException", (err) => {
    logger.error(`[FATAL ERROR] shard ${client.shard?.ids[0]} encountered a fatal error. (dump below)`)
    console.error(err)
    process.exit(1)
})