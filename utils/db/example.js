module.exports = class DatabaseExample {
    /**
     * 
     * @param {Object} options the options defined in config.js for the database
     */
    constructor(options) {
        // create connection and whatever here
    }

    createTables() {
        // generate the required threads and channels tables
        // table structure: 
        //  - thread: CREATE TABLE IF NOT EXISTS threads (id TEXT PRIMARY KEY, server TEXT)
        //  - channel: CREATE TABLE IF NOT EXISTS channels (id TEXT PRIMARY KEY, server TEXT)
        // where id is the id of the channel/thread and server is the id of the guild associated to the thread/channel
        // return nothing
    }

    insertChannel(id, guildid) {
        // insert a channel into the channels table
        // return nothing
    }

    insertThread(id, guildid) {
        // insert a thread into the threads ctable
        // return nothing
    }

    getChannels() {
        // get all channels
        // return in format [ { id: <id>, server: <server> }, ... ]
        // return value must be a promise
    }

    getThreads() {
        // get all threads
        // return in format [ { id: <id>, server: <server> }, ... ]
        // return value must be a promise
    }

    getThreadsInGuild(id) {
        // get all threads in a specific server. Same format as above
        // return value must be a promise
    }

    deleteThread(id) {
        // delete thread from the threads table
        // return nothing
    }

    deleteChannel(id) {
        // delete channel from the channels table
        // return nothing
    }
}