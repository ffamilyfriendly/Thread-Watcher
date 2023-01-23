import { ThreadAutoArchiveDuration, ThreadChannel } from "discord.js";
import { db, threads } from "../bot";

export function dueArchiveTimestamp(dueArchive: number): Number {
    return (Date.now() / 1000) + (dueArchive * 60)
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

export function addThread(id: string, dueArchive: Number, guildID: string): Promise<void> {
    return new Promise((resolve, reject) => {
        db.insertThread(id, dueArchive, guildID)
        .then(() => {
            threads.set(id, { id, server: guildID });
            resolve();
        })
        .catch(() => {
            reject()
        })
    })
}

export function removeThread(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
        db.deleteThread(id)
        .then(() => {
            threads.delete(id);
            resolve();
        })
        .catch(() => {
            reject()
        })
    })
}