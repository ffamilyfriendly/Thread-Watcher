import { Client, GatewayIntentBits } from "discord.js"
import config from "./config"
import Log75, { LogLevel } from "log75"
import loadEvents from "./utilities/loadEvents"
import loadCommands from "./utilities/loadCommands"
import { getDatabase } from "./utilities/database/DatabaseManager"
const logger = new Log75(LogLevel.Debug, { color: true })

const db = getDatabase(config.database.type, config.database.options)
db.createTables()

const client = new Client({
    intents: [ GatewayIntentBits.Guilds ]
})

loadEvents(client)
const commands = loadCommands()

export { client, logger, commands }

client.addListener("reloadCommands", (e) => {
    console.log(e)
})

client.login(config.tokens.discord)
.catch(err => {
    logger.error(`Could not authorise bot. ${err.toString()}`)
    process.exit(1)
})