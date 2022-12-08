import { ThreadChannel } from "discord.js";
import { logger } from "../bot";
import { setArchive } from "../utilities/threadActions";
import { db, threads } from "../bot";

export default function(oldThread: ThreadChannel, newThread: ThreadChannel) {
    if(!newThread.archived || oldThread.archived || !threads.has(newThread.id)) return
    if(!newThread.unarchivable) {
        logger.warn(`Skipped "${newThread.id}" in "${newThread.guildId}" as it is not unarchivable`)
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