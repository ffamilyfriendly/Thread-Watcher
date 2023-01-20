import { ThreadChannel } from "discord.js";
import { logger } from "../bot";
import { addThread, dueArchiveTimestamp, removeThread, setArchive } from "../utilities/threadActions";
import { db, threads } from "../bot";
import { threadShouldBeWatched } from "./threadCreate";

export default async function(oldThread: ThreadChannel, newThread: ThreadChannel) {
    
    const auto = (await db.getChannels(newThread.guildId)).find(t => t.id == newThread.parentId)
    if(auto) {

        const isWatched = threads.has(newThread.id)

        if(await threadShouldBeWatched(auto, newThread)) {
            if(!isWatched) {
                logger.info(`Automatically adding thread "${newThread.id}" in ${newThread.guildId} (TU)`)
                addThread(newThread.id, dueArchiveTimestamp(newThread.autoArchiveDuration||0), newThread.guildId)
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


    if(!newThread.archived || oldThread.archived || !threads.has(newThread.id)) return
    if(!newThread.unarchivable) {
        logger.warn(`Skipped "${newThread.id}" in "${newThread.guildId}" as it is not unarchivable`)
        return
    } else if (newThread.locked) {
        logger.warn(`Skipped "${newThread.id}" in "${newThread.guildId}" as it is locked`)
        return
    }

    const AUTOARCHIVEDURATION = 10_080
    setArchive(newThread, AUTOARCHIVEDURATION)
        .then(() => {
            if(newThread.autoArchiveDuration !== AUTOARCHIVEDURATION && newThread.manageable) newThread.setAutoArchiveDuration(AUTOARCHIVEDURATION)
            logger.info(`Unarchived "${newThread.id}" in "${newThread.guildId}"`)
        })
        .catch(err => {
            logger.error(`Failed to unarchive "${newThread.id}" in "${newThread.guildId}\n${err}"`)
        })
}