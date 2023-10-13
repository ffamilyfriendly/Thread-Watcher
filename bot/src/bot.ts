import { Client, GatewayIntentBits } from "discord.js"
import Log75, { LogLevel } from "log75"
import loadEvents from "./utilities/loadEvents"
import loadCommands from "./utilities/loadCommands"
import { DataBases, getDatabase } from "./utilities/database/DatabaseManager"
import { ThreadData } from "./interfaces/database"
import { red, green, yellow } from "ansi-colors"
import cnf from "./utilities/cnf"

const config = cnf()

class log76 extends Log75 {
    error(s: string) {
        super.print(s, `${client.shard?.ids[0]} ERR`, red, console.error)
    }

    done(s: string) {
        super.print(s, `${client.shard?.ids[0]} OK`, green, console.log)
    }

    warn(s: string) {
        super.print(s, `${client.shard?.ids[0]} WARN`, yellow, console.warn)
    }
}

const logger = new log76(LogLevel.Debug, { color: true })

const db = getDatabase(DataBases[config.database.type], config)
db.createTables()

const client = new Client({
    intents: [ GatewayIntentBits.Guilds ]
})

/*
    Sometimes ol' John is a silly willy and makes weird refferences that result in this file being ran without being called by
    the shard manager. This is rather silly as this makes the code think it's able to be strong and independant (tries authing as a non-sharded bot - This is bad).
    A very bodged fix for this is to find any orphan trying to be alive and make it not be alive anymore thanks to my special orphan killing algorith (patent pending)

    (I should try to find the root cause of this code being called in stand-alone mode but that is effort and I am lazy)
*/
let hasParent: boolean = true
if(!client.shard) {
    logger.debug("Orphan client detected.\nKilling the orphan :D")
    hasParent = false
}

loadEvents(client)
const commands = loadCommands()

const threads = new Map<string, ThreadData>();

export { client, logger, commands, db, threads, config }

if(hasParent) {
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
}

