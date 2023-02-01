import { ChannelData, Database, ReturnData, ThreadData } from "src/interfaces/database";
import sql, { Database as sqliteDatabase } from "better-sqlite3"

class sqlite implements Database {
    db: sqliteDatabase

    constructor() {
        this.db = sql("./data.db")
    }

    createTables(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.prepare("CREATE TABLE IF NOT EXISTS threads (id TEXT PRIMARY KEY, server TEXT, dueArchive INTEGER)").run()
            this.db.prepare("CREATE TABLE IF NOT EXISTS channels (id TEXT PRIMARY KEY, server TEXT, regex TEXT, roles TEXT, tags TEXT)").run()
            this.db.prepare("CREATE TABLE IF NOT EXISTS blacklist (id TEXT PRIMARY KEY, reason TEXT)").run()
            resolve()
        })
    };

    insertChannel( data: ChannelData ): Promise<void> {
        return new Promise((resolve, reject) => {
            const { id, server, regex, roles, tags } = data
            this.db.prepare("INSERT INTO channels VALUES(?,?, ?, ?, ?)").run(id, server, regex, roles.join(","), tags.join(","))
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

    getChannels(guildID: String): Promise<ChannelData[]> {
        return new Promise((resolve, reject) => {
            let returnArr: ChannelData[] = []
            returnArr.push( ...this.db.prepare("SELECT * FROM channels WHERE server = ?").all(guildID).map( item => {
                let rv: ChannelData = { id: item.id, server: item.server, regex: item?.regex, tags: item?.tags.split(","), roles: item?.roles.split(",") };
                return rv
            }) )
            resolve(returnArr)
        })
    };

    getThreads(guildID: String): Promise<ThreadData[]> {
        return new Promise((resolve, reject) => {
            let returnArr: ThreadData[] = []
            returnArr.push( ...this.db.prepare("SELECT * FROM threads WHERE server = ?").all(guildID) )
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

    deleteGuild(guildID: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.prepare("DELETE FROM channels WHERE server = ?").all(guildID)
            this.db.prepare("DELETE FROM threads WHERE server = ?").all(guildID)
            resolve()
        })
    };

    getNumberOfThreads(): Promise<number> {
        return new Promise((resolve, reject) => {
            const res = this.db.prepare("SELECT COUNT(*) FROM threads;").all()

            let count = res[0]
            if(count) count = Object.values(res[0])[0]
            else count = NaN

            resolve(count)
        })
    }

    getNumberOfChannels(): Promise<number> {
        return new Promise((resolve, reject) => {
            const res = this.db.prepare("SELECT COUNT(*) FROM channels;").all()

            let count = res[0]
            if(count) count = Object.values(res[0])[0]
            else count = NaN

            resolve(count)
        })
    }

}

export default sqlite