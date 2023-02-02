import { ThreadChannel } from "discord.js";
import { logger } from "../bot";
import { addThread, bumpAutoTime, dueArchiveTimestamp, removeThread, setArchive } from "../utilities/threadActions";
import { db, threads } from "../bot";
import { threadShouldBeWatched } from "./threadCreate";

export default async function(oldThread: ThreadChannel, newThread: ThreadChannel) {
    try {
        const auto = (await db.getChannels(newThread.guildId)).find(t => t.id == newThread.parentId)
    if(auto) {

        const isWatched = threads.has(newThread.id)

        if(await threadShouldBeWatched(auto, newThread)) {
            if(!isWatched) {
                logger.info(`Automatically adding thread "${newThread.id}" in ${newThread.guildId} (TU)`)
                addThread(newThread.id, dueArchiveTimestamp(newThread.autoArchiveDuration||0) as number, newThread.guildId)
                .catch(err => {
                    logger.error(`could not add thread "${newThread.id}" in ${newThread.guildId}: ${err.toString()}`)
                })
            }
        } else {
            if(isWatched) {
                logger.info(`Automatically removing thread "${newThread.id}" in ${newThread.guildId} (TU)`)
                removeThread(newThread.id)
            }
        }
    }


    if(!threads.has(newThread.id)) return
    if(!newThread.archived && !newThread.locked) {
        bumpAutoTime(newThread)
            .catch((e) => {
                logger.error(`failed to bump thread with id ${newThread.id}: ${e}`)
            })
    }  
    if(!newThread.unarchivable) {
        // For some reason this line kept breaking???
        console.warn(`Skipped "${newThread.id}" in "${newThread.guildId}" as it is not unarchivable`)
        return
    } else if (newThread.locked) {
        logger.warn(`Skipped "${newThread.id}" in "${newThread.guildId}" as it is locked`)
        return
    }

    /**
     * So, discord hates me and likes to just YOLO deploy thread related stuff which means the bot does not work :(
     * I recon this is due to the new dual states of threads. Threads can be archived and hidden, not archived and not hidden, not archived and hidden.
     * Bot still manages the "archived" state just fine but right now there's no way to explicitly set the "hidden" value.
     */

    const AUTOARCHIVEDURATION = 10_080
    setArchive(newThread, AUTOARCHIVEDURATION)
        .then(() => {
            if(newThread.autoArchiveDuration !== AUTOARCHIVEDURATION && newThread.manageable) newThread.setAutoArchiveDuration(AUTOARCHIVEDURATION)
            logger.info(`Unarchived "${newThread.id}" in "${newThread.guildId}"`)
        })
        .catch(err => {
            logger.error(`Failed to unarchive "${newThread.id}" in "${newThread.guildId}\n${err}"`)
        })
    } catch(err) {
        logger.error("Failed threadUpdate event (dump below)")
        console.error(err)
    }
}