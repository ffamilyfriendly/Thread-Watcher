const mysql = require("mysql"),
    { logger } = require("../clog.js")

module.exports = class DatabaseExample {
    /**
     * 
     * @param {Object} options the options defined in config.js for the database
     */
    constructor(options) {
        this.db = mysql.createConnection(options)
        this.db.connect((err) => {
            if(err) {
                logger.error(`could not connect do mysql database: ${err.toString()}`)
                process.exit(1)
            }
        })
    }

    createTables() {
        return new Promise((resolve, reject) => {
            // generate the required threads and channels tables
            // table structure: 
            //  - thread: CREATE TABLE IF NOT EXISTS threads (id TEXT PRIMARY KEY, server TEXT)
            //  - channel: CREATE TABLE IF NOT EXISTS channels (id TEXT PRIMARY KEY, server TEXT)
            // where id is the id of the channel/thread and server is the id of the guild associated to the thread/channel

            logger.info("Ensuring required tables exist...")
            this.db.query("CREATE TABLE IF NOT EXISTS `threadwatcher`.`threads` (`id` VARCHAR(20) NOT NULL, `server` VARCHAR(20) NOT NULL, `dueArchive` INT NOT NULL, PRIMARY KEY (`id`));", (err) => {
                if(err) {
                    logger.error(`could not create table threads: ${err.toString()}`)
                    process.exit(1)
                }

                this.db.query("CREATE TABLE IF NOT EXISTS `threadwatcher`.`channels` (`id` VARCHAR(20) NOT NULL, `server` VARCHAR(20) NOT NULL, PRIMARY KEY (`id`));", (err, e) => {
                    if(err) {
                        logger.error(`could not create table channels: ${err.toString()}`)
                        process.exit(1)
                    }

                    this.db.query("CREATE TABLE IF NOT EXISTS `threadwatcher`.`blacklist` (`id` VARCHAR(20) NOT NULL, `reason` VARCHAR(255) NOT NULL, PRIMARY KEY (`id`));", (err, e) => {
                        if(err) {
                            logger.error(`could not create table blacklist: ${err.toString()}`)
                            process.exit(1)
                        }
                        logger.done("tables ensured!")
                        resolve()
                    })
                })
            })
        })
    }

    insertChannel(id, guildid) {
        // insert a channel into the channels table
        this.db.query("INSERT INTO channels VALUES(?,?)", [ id, guildid ])
    }

    insertThread(id, guildid, dueArchive) {
        // insert a thread into the threads ctable
        this.db.query("INSERT INTO threads VALUES(?,?,?)", [ id, guildid, Math.floor(dueArchive) ])
    }

    getChannels() {
        // get all channels
        return new Promise((resolve, reject) => {
            this.db.query("SELECT * FROM channels", (err, res) => {
                if(err) reject(err)
                return resolve(res)
            })
        })
    }

    getThreads() {
        // get all threads
        return new Promise((resolve, reject) => {
            this.db.query("SELECT * FROM threads", (err, res) => {
                if(err) reject(err)
                return resolve(res)
            })
        })
    }

    getThreadsInGuild(id) {
        return new Promise((resolve, reject) => {
            this.db.query("SELECT * FROM threads WHERE server = ?", [id], (err, res) => {
                if(err) reject(err)
                return resolve(res)
            })
        })
    }

    deleteThread(id) {
        // delete thread from the threads table
        this.db.query("DELETE FROM threads WHERE id = ?", [id])
    }

    deleteChannel(id) {
        // delete channel from the channels table
        this.db.query("DELETE FROM channels WHERE id = ?", [id])
    }

    updateArchiveTimes(id, time) {
        // update a threads dueArchive property to the new archive time
        this.db.query("UPDATE threads SET dueArchive = ? WHERE id = ?", [time, id])
    }

    getArchivedThreads() {
        // search the database for threads whose dueArchive timestamp has passed
        // also return timestamps which are null since I initialy messed up when altering the table
        return new Promise((resolve, reject) => {
            this.db.query("SELECT * FROM threads WHERE dueArchive IS NULL OR dueArchive < UNIX_TIMESTAMP()", (err, res) => {
                if(err) reject(err)
                return resolve(res)
            })
        })
    }

    getBlacklistEntry(id) {
        // if an entry in blacklist exists for guild return that
        return new Promise((resolve, reject) => {
            this.db.query("SELECT * FROM blacklist WHERE id = ?", [id], (err, res) => {
                if(err) reject(err)
                return resolve(res[0])
            }) 
        })
    }

    setBlacklistEntry(id, reason) {
        // adds a blacklist entry for a server which will block that server from using thread-watcher
        this.db.query("INSERT INTO blacklist VALUES(?,?)", [ id, reason ])
    }

    removeBlacklistEntry(id) {
        // removes a blacklist entry
        this.db.query("DELETE FROM blacklist WHERE id = ?", [id])
    }
}