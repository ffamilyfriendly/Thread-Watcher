import { ThreadChannel } from "discord.js";
import { logger } from "../bot";
import { dueArchiveTimestamp } from "../utilities/threadActions";
import { db, threads } from "../bot";

export default function(oldThread: ThreadChannel, newThread: ThreadChannel) {
    if(!newThread.archived || oldThread.archived || !threads.has(newThread.id)) return
    if(!newThread.unarchivable) {
        logger.warn(`Skipped "${newThread.id}" in "${newThread.guildId}" as it is not unarchivable`)
        return
    }
    newThread.setArchived(false)
    logger.info(`Unarchived "${newThread.id}" in "${newThread.guildId}"`)
    db.updateDueArchive(newThread.id, dueArchiveTimestamp(newThread.autoArchiveDuration||0))
}