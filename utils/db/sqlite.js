const sql = require("better-sqlite3"),
    { logger } = require("../clog.js")

module.exports = class DatabaseExample {
    /**
     * 
     * @param {Object} options the options defined in config.js for the database
     */
    constructor(options) {
        this.db = sql("./data.db")
    }

    createTables() {
        // generate the required threads and channels tables
        // table structure: 
        //  - thread: CREATE TABLE IF NOT EXISTS threads (id TEXT PRIMARY KEY, server TEXT)
        //  - channel: CREATE TABLE IF NOT EXISTS channels (id TEXT PRIMARY KEY, server TEXT)
        // where id is the id of the channel/thread and server is the id of the guild associated to the thread/channel

        this.db.prepare("CREATE TABLE IF NOT EXISTS threads (id TEXT PRIMARY KEY, server TEXT, dueArchive INTEGER)").run()

        // channels for auto-watch threads
        this.db.prepare("CREATE TABLE IF NOT EXISTS channels (id TEXT PRIMARY KEY, server TEXT)").run()
    }

    insertChannel(id, guildid) {
        // insert a channel into the channels table
        this.db.prepare("INSERT INTO channels VALUES(?,?)").run(id, guildid)
    }

    insertThread(id, guildid, dueArchived) {
        // insert a thread into the threads ctable
        this.db.prepare("INSERT INTO threads VALUES(?,?,?)").run(id, guildid, dueArchived)
    }

    getChannels() {
        // get all channels
        return new Promise((resolve, reject) => {
            resolve(this.db.prepare(`SELECT * FROM channels`).all())
        })
    }

    getThreads() {
        // get all threads
        return new Promise((resolve, reject) => {
            resolve(this.db.prepare(`SELECT * FROM threads`).all())
        })
    }

    getThreadsInGuild(id) {
        return new Promise((resolve, reject) => {
            resolve(this.db.prepare('SELECT * FROM threads WHERE server = ?').all(id))
        })
    }

    deleteThread(id) {
        // delete thread from the threads table
        this.db.prepare(`DELETE FROM threads WHERE id = ?`).run(id)
    }

    deleteChannel(id) {
        // delete channel from the channels table
        this.db.prepare(`DELETE FROM channels WHERE id = ?`).run(id)
    }

    updateArchiveTimes(id, time) {
        // update a threads dueArchive property to the new archive time
        this.db.prepare("UPDATE threads SET dueArchive = ? WHERE id = ?").run(time, id)
    }

    getArchivedThreads() {
        // search the database for threads whose dueArchive timestamp has passed
        return new Promise((resolve, reject) => {
            resolve(this.db.prepare("SELECT * FROM threads WHERE dueArchive < strftime('%s','now')").all())
        })
    }
}