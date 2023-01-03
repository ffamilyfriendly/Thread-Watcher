import { client, logger } from "../../bot";
import { ThreadData } from "../../interfaces/database";
import { setArchive } from "../threadActions";

let queue: ThreadData[] = []
let running = false
let runStart = Date.now()
let threadsProcessed = 0

const elapsedTime = () => (Date.now() - runStart) / 1000 / 60

const run = () => {
    running = true

    const t = queue.shift()
    if(!t) return running = false
    client.channels.fetch(t?.id).then(thread => {
        if(!thread?.isThread()) return
        if(thread.archived && thread.unarchivable) {
            setArchive(thread)
        }
        threadsProcessed += 1
    })
    .catch(e => {
        logger.error(`[ensureThread/run] issue with thread ${t.id}:\n${e.toString()} (dump below)`)
        console.error(e)
    })

    if(threadsProcessed % 100 === 0) {
        logger.table({
            "queue length": queue.length,
            "threads processed": threadsProcessed,
            "time elapsed": `${elapsedTime().toFixed(2)}m`,
            "time left": `${(( queue.length * 1000/20) / 1000 ).toFixed(2)}s`
        }, "info")
    }

    if(queue.length !== 0) setTimeout(run, 1000/20)
    else {
        running = false
        logger.done(`[ensureThread/run] queue empty. Runtime: ${elapsedTime()} minutes`)
    }
}

export default function ensureThreads( threads: ThreadData[] ) {
    if(threads.length === 0) return
    logger.info(`[ensureThreads] adding ${threads.length} threads to queue from server ${threads[0].server}`)
    queue.push( ...threads )

    if(!running) run()
}

export function getPossiblyArchivedThreads( threads: ThreadData[] ) {
    let MaybeArchived: ThreadData[] = []
    for( const thread of threads ) {
        const delta = thread.dueArchive - (Date.now()/1000)
        if(delta < 0) MaybeArchived.push(thread)
    }
    return MaybeArchived
}