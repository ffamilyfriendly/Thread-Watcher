import { ActivityType, Client } from "discord.js";
import ensureThreads, { getPossiblyArchivedThreads } from "../utilities/routines/ensureThreads";
import { db, logger, threads } from "../bot";
import { bumpThreadsRoutine } from "../utilities/routines/ensureVisible";



export default function(client: Client) {
    logger.info(`Client ready! `)

    const loadThreads = () => {
        for(const [id,guild] of client.guilds.cache) {
            db.getThreads(guild.id)
            .then((res) => {
                for(const t of res)
                    threads.set(t.id, t)
                ensureThreads(getPossiblyArchivedThreads(res))
            })
        }
    }

    loadThreads()

    //client.guilds.cache


    const setPresence = () => {
        client.user?.setPresence({ activities:[{ name:"your threads 🧵", type: ActivityType.Watching }], status: "online" })
    }

    setPresence()
    setInterval(setPresence, 1000 * 60 * 60)

    // DO NOT LEAVE THIS AS ONE MINUTE DUMBO
    setInterval(bumpThreadsRoutine, 1000 * 60 * 4)
}