import { Client, GatewayIntentBits } from "discord.js"
import config from "./config"
import Log75, { LogLevel } from "log75"
import loadEvents from "./utilities/loadEvents"
console.log("a", __dirname)
import loadCommands from "./utilities/loadCommands"

const logger = new Log75(LogLevel.Debug, { color: true })

const client = new Client({
    intents: [ GatewayIntentBits.Guilds ]
})

loadEvents(client)
const commands = loadCommands()

export { client, logger, commands }

client.login(config.tokens.discord)
.catch(err => {
    logger.error(`Could not authorise bot. ${err.toString()}`)
    process.exit(1)
})