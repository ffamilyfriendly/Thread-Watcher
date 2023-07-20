import { ActivityType, Client } from "discord.js";
import { db, logger, threads } from "../bot";
import { bumpThreadsRoutine } from "../utilities/routines/ensureVisible";
import { ThreadData } from "src/interfaces/database";



export default function(client: Client) {
    logger.info(`Client ready! `)

    const loadThreads = (): Promise<ThreadData[]|void>[] => {
        let promises: Promise<ThreadData[]|void>[] = []

        for(const [_id,guild] of client.guilds.cache) {
            let dbPromise: Promise<ThreadData[]|void> = db.getThreads(guild.id)
            .then((res) => {
                for(const t of res)
                    threads.set(t.id, t)
            })

            promises.push(dbPromise)
        }

        return promises
    }

    const setPresence = () => {
        client.user?.setPresence({ activities:[{ name:"your threads 🧵", type: ActivityType.Watching }], status: "online" })
    }

    setPresence()
    setInterval(setPresence, 1000 * 60 * 60)

    Promise.allSettled(loadThreads())
        .then(bumpThreadsRoutine)
        .catch(e => {
            logger.warn(`[Ready] could not load data for some guilds`)
            console.warn(e)
        })
    setInterval(bumpThreadsRoutine, 1000 * 60 * 50)
}