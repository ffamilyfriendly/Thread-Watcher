import { ChannelData, Database, ThreadData } from "../../interfaces/database";
import { Connection, createConnection } from "mysql";
import { ConfigFile } from "../cnf";

class mysql implements Database {

    connection: Connection
    database: string

    constructor(config: ConfigFile) {
        const { host, user, password, database } = config.database.options

        this.database = database
        this.connection = createConnection({
            host, user, password, database
        })
    }

    createTables(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.connection.connect(async (err) => {
                if(err) {
                    console.log(err)
                    reject(err)
                } 

                this.connection.query(`CREATE TABLE IF NOT EXISTS \`${this.database}\`.\`threads\` (\`id\` VARCHAR(20) NOT NULL, \`server\` VARCHAR(20) NOT NULL, \`dueArchive\` INT NOT NULL, watching BOOLEAN, PRIMARY KEY (\`ID\`));`, (err) => {
                    if(err) {
                        console.error(`[MYSQL] could not create table threads`, err)
                        process.exit(1)
                    }                    

                    this.connection.query(`CREATE TABLE IF NOT EXISTS \`${this.database}\`.\`channels\` (\`id\` VARCHAR(20) NOT NULL, \`server\` VARCHAR(20) NOT NULL, \`regex\` TINYTEXT, \`roles\` TEXT, \`tags\` TEXT);`, (err) => {
                        if(err) {
                            console.error(`[MYSQL] could not create table channels`, err)
                            process.exit(1)
                        }

                        resolve()
                    })
                })
            })
        })
    };



    insertChannel( data: ChannelData ): Promise<void> {
        return new Promise((resolve, reject) => {
            const { id, server, regex, roles, tags } = data
            this.connection.query("INSERT INTO channels VALUES(?,?,?,?,?)", [ id, server, regex, roles.join(","), tags.join(",") ], (err) => {
                if(err) return reject(err)
                resolve()
            })
        })
    };

    insertThread(id: String, dueArchive: Number, guildID: String): Promise<void> {
        return new Promise((resolve, reject) => {
            this.connection.query("REPLACE INTO threads VALUES(?,?,?,true)", [ id, guildID, dueArchive ], (err) => {
                if(err) return reject(err)
                resolve()
            })
        })
    };

    updateDueArchive(id: String, dueArchive: Number): Promise<void> {
        return new Promise((resolve, reject) => {
            this.connection.query("UPDATE threads SET dueArchive = ? WHERE id = ?", [ dueArchive, id ], (err) => {
                if(err) return reject(err)
                resolve()
            })
        })
    };

        /**
     * 
     *             returnArr.push( ...this.db.prepare("SELECT * FROM channels WHERE server = ?").all(guildID).map( item => {
                let rv: ChannelData = { id: item.id, server: item.server, regex: item?.regex, tags: item?.tags.split(","), roles: item?.roles.split(",") };
                return rv
            }) )
     * 
     * @param data 
     * @returns 
     */

    getChannels(guildID: String): Promise<ChannelData[]> {

        type rawChannelData = {
            id: string,
            server: string,
            regex?: string,
            roles?: string
            tags?: string
        }

        return new Promise((resolve, reject) => {
            let returnArr: ChannelData[] = []
            this.connection.query("SELECT * FROM channels WHERE server = ?", [ guildID ], (err, res: rawChannelData[]) => {
                if(err) reject(err)
                
                for(const row of res)
                    returnArr.push({ id: row.id, server: row.server, regex: row.regex||"", tags: row.tags?.split(",")||[], roles: row.roles?.split(",")||[] })

                return resolve(returnArr)
            })
        })
    };

    getThreads(guildID: String): Promise<ThreadData[]> {
        return new Promise((resolve, reject) => {
            this.connection.query("SELECT * FROM threads WHERE server = ? AND watching = 1", [ guildID ], (err, res) => {
                if(err) reject(err)
                return resolve(res)
            })
        })
    };

    deleteThread(threadID: String): Promise<void> {
        return new Promise((resolve, reject) => {
            this.connection.query("DELETE FROM threads WHERE id = ?", [ threadID ], (err, res) => {
                if(err) reject(err)
                return resolve(res)
            })
        })
    };

    deleteChannel(channelID: String): Promise<void> {
        return new Promise((resolve, reject) => {
            this.connection.query("DELETE FROM channels WHERE id = ?", [ channelID ], (err, res) => {
                if(err) reject(err)
                return resolve(res)
            })
        })
    };

    deleteGuild(guildID: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const promises = []
            promises.push(this.connection.query("DELETE FROM channels WHERE server = ?", [ guildID ]))
            promises.push(this.connection.query("DELETE FROM threads WHERE server = ?", [ guildID ]))
            Promise.all(promises)
                .then(() => resolve())
                .catch(reject)
        })
    };

    unwatchThread(threadID: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.connection.query("UPDATE threads SET watching = 0 WHERE id = ?", [ threadID ], (err, res) => {
                if(err) reject(err)
                return resolve(res)
            })
        })
    };

    getNumberOfThreads(): Promise<number> {
        return new Promise((resolve, reject) => {
            this.connection.query("SELECT COUNT(*) FROM threads;", (err, res) => {
                if(err) reject(err)
                console.log(res)
                let count = res[0]
                if(count) count = Object.values(res[0])[0]
                else count = NaN

                return resolve(count)
            })
        })
    }

    getNumberOfChannels(): Promise<number> {
        return new Promise((resolve, reject) => {
            this.connection.query("SELECT COUNT(*) FROM channels;", (err, res) => {
                if(err) reject(err)
                let count = res[0]
                if(count) count = Object.values(res[0])[0]
                else count = NaN
                
                return resolve(count)
            })
        })
    }

}

export default mysql