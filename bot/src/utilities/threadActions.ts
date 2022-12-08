import { ThreadAutoArchiveDuration, ThreadChannel } from "discord.js";
import { db, threads } from "../bot";

export function dueArchiveTimestamp(dueArchive: number): Number {
    return (Date.now() / 1000) + (dueArchive * 60)
}

export function setArchive(thread: ThreadChannel, dueArchive: number) {
    return new Promise((resolve, reject) => {
        thread.setArchived(false)
            .then(() => {
                thread.setAutoArchiveDuration(dueArchive)
                db.updateDueArchive(thread.id, dueArchiveTimestamp(dueArchive))
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