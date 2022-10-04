import { ActivityType, Client } from "discord.js";
import { logger } from "../bot";


export default function(client: Client) {
    logger.info(`Client ready! `)

    /*
        place startup routine code here.
        Now that we are using shards we'll only keep the threads for this current shard cached
        instead of ALL the threads and channels like on the old version
    */

    //client.guilds.cache

    const setPresence = () => {
        client.user?.setPresence({ activities:[{ name:"your threads 🧵", type: ActivityType.Watching }], status: "online" })
    }

    setPresence()
    setInterval(setPresence, 1000 * 60 * 60)
}