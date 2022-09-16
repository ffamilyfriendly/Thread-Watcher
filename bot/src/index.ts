import { Client, ShardingManager } from "discord.js";
import config from "./config"
import Log75, { LogLevel } from "log75"
import { AutoPoster } from "topgg-autoposter"

const logger = new Log75(LogLevel.Debug, { color: true })

const manager = new ShardingManager("./dist/bot.js", { token: config.tokens.discord })

if(config.tokens.topgg) {
    logger.info("Using top.gg autoposter")
    AutoPoster(config.tokens.topgg, manager)
}

manager.on("shardCreate", shard => {
    logger.done(`Shard with id ${shard.id} spawned!`)
})

manager.spawn()
