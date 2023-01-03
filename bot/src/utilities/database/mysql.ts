import { ChannelData, Database, ReturnData, ThreadData } from "../../interfaces/database";
import { Connection, createConnection, MysqlError, queryCallback, QueryFunction, QueryOptions } from "mysql";
import config from "../../config";

class mysql implements Database {

    connection: Connection
    database: string

    constructor() {
        const { host, user, password, database } = config.database.options

        this.database = database
        this.connection = createConnection({
            host, user, password, database
        })

    }

    private promiseWrap(func: QueryFunction, params: string|QueryOptions) {
        return new Promise((resolve, reject) => {
            func( params, (err: MysqlError|undefined, res: queryCallback|undefined) => {
                if(err) reject(err)
                if(res) resolve(res)
            } )
        })
    }

    createTables(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.connection.connect(async (err) => {
                if(err) {
                    console.log(err)
                    reject(err)
                } 

                this.connection.query(`CREATE TABLE IF NOT EXISTS \`${this.database}\`.\`threads\` (\`id\` VARCHAR(20) NOT NULL, \`server\` VARCHAR(20) NOT NULL, \`dueArchive\` INT NOT NULL, PRIMARY KEY (\`ID\`));`, (err) => {
                    if(err) {
                        console.error(`[MYSQL] could not create table threads`, err)
                        process.exit(1)
                    }                    
                })

                this.connection.query(`CREATE TABLE IF NOT EXISTS \`${this.database}\`.\`channels\` (\`id\` VARCHAR(20) NOT NULL, \`server\` VARCHAR(20) NOT NULL, \`regex\` TINYTEXT, \`roles\` TEXT, \`tags\` TEXT);`, (err) => {
                    if(err) {
                        console.error(`[MYSQL] could not create table channels`, err)
                        process.exit(1)
                    }
                })
                //resolve()
            })
        })
    };

    insertChannel( data: ChannelData ): Promise<void> {
        return new Promise((resolve, reject) => {
            this.connection.query("INSERT INTO channels VALUES(?,?,?,?)", (err) => {
                if(err) return reject(err)
                resolve()
            })
        })
    };

    insertThread(id: String, dueArchive: Number, guildID: String): Promise<void> {
        return new Promise((resolve, reject) => {
            this.connection.query("INSERT INTO threads VALUES(?,?,?)", [ id, guildID, dueArchive ], (err) => {
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

    getChannels(guildID: String): Promise<ChannelData[]> {
        return new Promise((resolve, reject) => {
            this.connection.query("SELECT * FROM channels WHERE server = ?", [ guildID ], (err, res) => {
                if(err) reject(err)
                return resolve(res)
            })
        })
    };

    getThreads(guildID: String): Promise<ThreadData[]> {
        return new Promise((resolve, reject) => {
            this.connection.query("SELECT * FROM threads WHERE server = ?", [ guildID ], (err, res) => {
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

}

export default mysql