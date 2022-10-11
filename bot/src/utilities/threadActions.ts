import { db, threads } from "../bot";

export function dueArchiveTimestamp(dueArchive: number): Number {
    return (Date.now() / 1000) + (dueArchive * 60)
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