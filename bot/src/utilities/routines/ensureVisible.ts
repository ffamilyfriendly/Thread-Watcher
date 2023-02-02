import { PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { client, logger, threads } from "../../bot";
import { ThreadData } from "../../interfaces/database";
import { bumpAutoTime } from "../threadActions";
import { getPossiblyArchivedThreads } from "./ensureThreads";

const queue: ThreadData[] = [ ]
let running = false

const makeVisible = () => {

    const t = queue.shift()
    if(!t) return running = false

    client.channels.fetch(t?.id).then(thread => {
        if(!thread?.isThread()) return

        if(!thread.locked && thread.manageable) {
            thread.setAutoArchiveDuration(4320)
                .then(() => {
                    thread.setAutoArchiveDuration(10080)
                        .catch(() => {
                            logger.error(`could not set thread ${thread.id} to 10080 autoArchiveDuration`)
                        })
                })
                .catch(e => {
                    logger.error(`could not bump thread ${thread.id}`)
                })
        } else if(!thread.manageable && thread.sendable && !thread.archived) {
            if(thread.permissionsFor(thread.client.user.id)?.has(PermissionFlagsBits.EmbedLinks)) {
                const e = new EmbedBuilder()
                    .setTitle("Bumping Thread")
                    .setFields([ { name: "Why?", value: "this message is sent to bump activity so this thread does not get hidden." }, { name: "Tired of these messages?", value: `give me \`manage threads\` in <#${thread.parentId}>.` } ])
                thread.send({ embeds: [ e ] })
            } else {
                thread.send(`**Bumping thread**\nDont mind me, i'm just making sure this thread is visible under your channel 👉😎👉\n*prefer silent bumps? Give me \`manage threads\` in <#${thread.parentId}>`)
            }
        } else {
            logger.error(`could not bump thread ${thread.id}`)
        }

        bumpAutoTime(thread)

    })
    .catch(e => {
        logger.error(`could not get thread with id ${t.id} thus not bumping it (dump below)`)
        console.error(e)
    })

    if(queue.length !== 0) setTimeout(makeVisible, 1000/2)
    else {
        running = false
    }
}

export default function bumpThreads( t: ThreadData[] ) {
    queue.push( ...t )
    if(!running) makeVisible()
}

export function bumpThreadsRoutine() {
    const needsBump = getPossiblyArchivedThreads([ ...threads.values() ])
    if(needsBump.length === 0) return logger.info("no threads to bump")
    logger.info(`Bumping ${needsBump.length} threads`)
    bumpThreads(needsBump)
}