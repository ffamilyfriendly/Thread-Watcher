import { Client, GatewayIntentBits } from "discord.js"
import config from "./config"
import Log75, { LogLevel } from "log75"
import loadEvents from "./utilities/loadEvents"

const logger = new Log75(LogLevel.Debug, { color: true })

const client = new Client({
    intents: [ GatewayIntentBits.Guilds ]
})

loadEvents(client)

export { client, logger }

client.login(config.tokens.discord)
.catch(err => {
    logger.error(`Could not authorise bot. ${err.toString()}`)
    process.exit(1)
})