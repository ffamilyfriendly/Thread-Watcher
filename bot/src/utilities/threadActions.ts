import { ThreadChannel } from "discord.js";
import { db, threads } from "../bot";

/**
 * 
 * @param dueArchive the amount of time a thread has to be inactive for discord to hide it, in minutes
 * @param fromDate from what timestamp to calculate when thread will be hidden 
 * @returns {Number} the calculated timestamp where a thread will be hidden
 */
export function dueArchiveTimestamp(dueArchive: number, fromDate?: Date): Number {
    const date = fromDate || new Date()
    return (date.getTime() / 1000) + (dueArchive * 60)
}

export function setArchive(thread: ThreadChannel, dueArchive: number = 10_080) {
    return new Promise((resolve, reject) => {
        if(thread.locked) resolve(null);

        thread.setArchived(false)
            .then(() => {
                let DArchive = thread.autoArchiveDuration
                if(thread.manageable) {
                    thread.setAutoArchiveDuration(dueArchive)
                    DArchive = dueArchive
                }
                db.updateDueArchive(thread.id, dueArchiveTimestamp(DArchive||0))
                    .then(resolve)
                    .catch(reject)
            })
            .catch(reject)
    })
}

export function bumpAutoTime(thread: ThreadChannel) {
    return new Promise((resolve, reject) => {
        let t = threads.get(thread.id)
        if(!t) return reject(`thread ${thread.id} not in thread list`)
        const newTimeStamp = dueArchiveTimestamp(thread.autoArchiveDuration||0) as number
        t.dueArchive = newTimeStamp

        db.updateDueArchive(thread.id, newTimeStamp)
            .then(resolve)
            .catch(reject)
    })
}

export function addThread(id: string, dueArchive: number, guildID: string): Promise<void> {
    return new Promise((resolve, reject) => {
        db.insertThread(id, dueArchive, guildID)
        .then(() => {
            threads.set(id, { id, server: guildID, dueArchive: dueArchive, watching: true });
            resolve();
        })
        .catch(() => {
            reject()
        })
    })
}

export function removeThread(id: string, force: boolean = false): Promise<void> {
    return new Promise((resolve, reject) => {
        force ? db.deleteThread(id) : db.unwatchThread(id)
        .then(() => {
            threads.delete(id);
            resolve();
        })
        .catch((e) => {
            console.error(e)
            reject()
        })
    })
}

export function clearGuild(id: string): Promise<void> {
    threads.forEach(t => {
        if(t.server == id) threads.delete(t.id)
    })
    return db.deleteGuild(id)
}