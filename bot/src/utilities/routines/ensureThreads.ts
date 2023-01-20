import { client, db, logger } from "../../bot";
import { ThreadData } from "../../interfaces/database";
import { setArchive } from "../threadActions";

/**
 * Hey there im past John and I coded this shit. Does it work well for 5 guilds? yep. Does it work well for 4000 guilds? fuck if i know
 * You will probably find angry messages from future John below where he damns me and everything I stand for.
 * I'd like to humbly request future John and anyone else reading this to listen to the attached song
 * https://www.youtube.com/watch?v=-gnDyhN5ilM
 * 
 * 
 */

let queue: ThreadData[] = []
let running = false
let runStart = Date.now()
let threadsProcessed = 0

const elapsedTime = () => (Date.now() - runStart) / 1000 / 60

const run = () => {
    running = true

    const t = queue.shift() 
    if(!t) return running = false

    // Fetch the thread from d.js cache or if not already cached directly from discord servers
    client.channels.fetch(t?.id).then(thread => {
        if(!thread?.isThread()) return

        // if thread is archived and unarchivable we will unarchive the thread
        if(thread.archived && thread.unarchivable && !thread.locked) {
            setArchive(thread)
        } else {
            if(thread?.autoArchiveDuration) db.updateDueArchive(thread.id, thread.autoArchiveDuration)
        }
        threadsProcessed += 1
    })
    .catch(e => {
        
        const eString: string = e.toString()
        // If permissions error on thread we set its dueUpdate time to the max so it does not waste our ratelimits
        if(eString.includes("Missing Access") || eString.includes("Unknown Channel")) db.updateDueArchive(t.id, 2147483645)
        logger.error(`[ensureThread/run] issue with thread ${t.id}:\n${eString}`)
    })

    // every 1000 threads we will display an info table. This makes it really fun to watch during the startup routine and has no real function
    if(threadsProcessed % 1000 === 0) {
        logger.table({
            "queue length": queue.length,
            "threads processed": threadsProcessed,
            "time elapsed": `${elapsedTime().toFixed(2)}m`,
            "time left": `${(( queue.length * 1000/6) / 1000 ).toFixed(2)}s`
        }, "info")
    }

    if(queue.length !== 0) setTimeout(run, 1000/6)
    else {
        running = false
        logger.done(`[ensureThread/run] queue empty. Runtime: ${elapsedTime()} minutes`)
    }
}

/**
 * @description This function will add the provided threads to a queue and start the thread checker routine if it is not already running
 * @param {ThreadData[]} threads the possibly archived thread of the server
 * @returns 
 */
export default function ensureThreads( threads: ThreadData[] ) {
    if(threads.length === 0) return
    logger.info(`[ensureThreads] adding ${threads.length} threads to queue from server ${threads[0].server}`)
    queue.push( ...threads )

    if(!running) run()
}

/**
 * @description Given an array of threads this function will return threads whos dueArchive property is in the past
 * @param threads 
 */
export function getPossiblyArchivedThreads( threads: ThreadData[] ) {
    let MaybeArchived: ThreadData[] = []
    for( const thread of threads ) {
        const delta = thread.dueArchive - (Date.now()/1000)
        if(delta < 0) MaybeArchived.push(thread)
    }
    return MaybeArchived
}