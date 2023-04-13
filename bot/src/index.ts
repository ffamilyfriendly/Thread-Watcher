import { ShardingManager, WebhookClient, EmbedBuilder, Colors, ColorResolvable } from "discord.js";
import Log75, { LogLevel } from "log75"
import { AutoPoster } from "topgg-autoposter"
import { clearCommands } from "./utilities/registerCommands";
import start from "./web";
import cnf from "./utilities/cnf"
import { DataBases } from "./utilities/database/DatabaseManager";

const config = cnf()

const webhookClient = config.logWebhook ? new WebhookClient({ url: config.logWebhook }) : null;

const webLog = (title: string, description: string|null, colour: ColorResolvable = Colors.Aqua) => {
    if(!webhookClient) return
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setTimestamp(new Date())
        .setColor(colour)
    if(description) embed.setDescription(description)
    
    webhookClient.send({
        username: "Thread-Watcher",
        avatarURL: "https://threadwatcher.xyz/content/icon.png",
        embeds: [embed]
    })
}

const args = process.argv.slice(2)
if(args.includes("-clear_commands")) {
    const local = args.includes("-local")
    clearCommands(local, config)
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
const manager = new ShardingManager("./dist/bot.js", { token: config.tokens.discord, shardArgs:  args  })

export { logger, config }

if(config.tokens.topgg) {
    logger.info("Using top.gg autoposter")
    AutoPoster(config.tokens.topgg, manager)
}

const webserver = () => {
    if(config.statsServer.enabled) start(manager, config.statsServer.port, DataBases[config.database.type])
}

let timeOut = setTimeout(() => { }, 100000);

manager.on("shardCreate", shard => {
    if(timeOut) clearTimeout(timeOut)
    logger.done(`Shard with id ${shard.id} spawned!`)
    webLog(`Shard ${shard.id} spawned!`, null)

    shard.addListener("ready", () => {
        webLog(`Shard ${shard.id} ready!`, null, Colors.Green)
    })

    shard.addListener("death", () => {
        webLog(`Shard ${shard.id} died!`, null, Colors.Red)
    })

    shard.addListener("disconnect", () => {
        webLog(`Shard ${shard.id} disconnected!`, null, Colors.Orange)
    })

    shard.addListener("reconnecting", () => {
        webLog(`Shard ${shard.id} is reconnecting!`, null, Colors.DarkGreen)
    })

    timeOut = setTimeout(webserver, 1000 * 60 * 2)
})

manager.spawn()
    .then(() => {
        logger.debug("Shard Manager spawned!")
    })
    .catch(e => {
        logger.error("Failed to spawn Shard Manager. (dump below)")
        console.error(e)
    })

const killChildren = () => {
    manager.shards.forEach(s => s.kill())
}

process.on("SIGABRT", killChildren)
process.on("SIGINT", killChildren)