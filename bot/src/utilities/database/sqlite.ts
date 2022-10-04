import { Database, ReturnData } from "src/interfaces/database";
import sql, { Database as sqliteDatabase } from "better-sqlite3"

class sqlite implements Database {
    db: sqliteDatabase

    constructor() {
        this.db = sql("./data.db")
    }

    createTables(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.prepare("CREATE TABLE IF NOT EXISTS threads (id TEXT PRIMARY KEY, server TEXT, dueArchive INTEGER)").run()
            this.db.prepare("CREATE TABLE IF NOT EXISTS channels (id TEXT PRIMARY KEY, server TEXT)").run()
            this.db.prepare("CREATE TABLE IF NOT EXISTS blacklist (id TEXT PRIMARY KEY, reason TEXT)").run()
            resolve()
        })
    };

    insertChannel(id: String, guildID: String): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.prepare("INSERT INTO channels VALUES(?,?)").run(id, guildID)
            resolve()
        })
    };

    insertThread(id: String, dueArchive: Number, guildID: String): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.prepare("INSERT INTO threads VALUES(?,?,?)").run(id, guildID, dueArchive)
            resolve()
        })
    };

    updateDueArchive(id: String, dueArchive: Number): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.prepare("UPDATE threads SET dueArchive = ? WHERE id = ?").run(dueArchive, id)
            resolve()
        })
    };

    getArchivedThreads(guildIDs: String[]): Promise<{ id: String; server: String; }[]> {
        return new Promise((resolve, reject) => {
            let returnArr: ReturnData[] = []
            returnArr.push( ...this.db.prepare("SELECT * FROM threads WHERE dueArchive < strftime('%s','now') AND id IN(?)").all(guildIDs) )
            resolve(returnArr)
        })
    };

    getChannels(guildIDs: String[]): Promise<ReturnData[]> {
        return new Promise((resolve, reject) => {
            let returnArr: ReturnData[] = []
            returnArr.push( ...this.db.prepare("SELECT * FROM channels WHERE id IN(?)").all(guildIDs) )
            resolve(returnArr)
        })
    };

    getThreads(guildIDs: String[]): Promise<ReturnData[]> {
        return new Promise((resolve, reject) => {
            let returnArr: ReturnData[] = []
            returnArr.push( ...this.db.prepare("SELECT * FROM threads WHERE id IN(?)").all(guildIDs) )
            resolve(returnArr)
        })
    };

    getThreadsInGuild(guildID: String): Promise<ReturnData[]> {
        return new Promise((resolve, reject) => {
            let returnArr: ReturnData[] = []
            returnArr.push( ...this.db.prepare("SELECT * FROM threads WHERE id = ?").all(guildID) )
            resolve(returnArr)
        })
    };

    deleteThread(threadID: String): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.prepare("DELETE FROM threads WHERE id = ?").run(threadID)
            resolve()
        })
    };

    deleteChannel(channelID: String): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.prepare("DELETE FROM channels WHERE id = ?").run(channelID)
            resolve()
        }) 
    };

}

export default sqlite