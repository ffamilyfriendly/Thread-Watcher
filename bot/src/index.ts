import { ShardingManager } from "discord.js";
import config from "./config"
import Log75, { LogLevel } from "log75"
import { AutoPoster } from "topgg-autoposter"
import registerCommands, { clearCommands } from "./utilities/registerCommands";
import start from "./web";

const args = process.argv.slice(2)
if(args.includes("-reg_commands")) {
    registerCommands(!args.includes("-local"))
}
if(args.includes("-clear_commands")) {
    const local = args.includes("-local")
    clearCommands(local)
        .then(() => {
            logger.done(`removed all ${ local ? "local" : "global" } commands. Exiting...`)
            process.exit(0)
        })
        .catch((err) => {
            logger.error(`failed to remove all ${ local ? "local" : "global" } commands.\n${err}`)
            process.exit(1)
        })
}

const logger = new Log75(LogLevel.Debug, { color: true })
const manager = new ShardingManager("./dist/bot.js", { token: config.tokens.discord })

export { logger }

if(config.tokens.topgg) {
    logger.info("Using top.gg autoposter")
    AutoPoster(config.tokens.topgg, manager)
}

manager.on("shardCreate", shard => {
    logger.done(`Shard with id ${shard.id} spawned!`)
})

manager.spawn()

if(config.statsServer.enabled) start(manager, config.statsServer.port)