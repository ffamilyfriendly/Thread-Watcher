const { threads, channels, db } = require("../index.js")

const addThread = ( threadid, guildid, table = "channel" ) => {
    if(threads.has(threadid)) return
    if(typeof table === "number"){
        db.insertThread(threadid, guildid, table)
        threads.set(threadid, { threadID: threadid, serverID: guildid })
    }
    else {
        db.insertChannel(threadid, guildid)
        channels.set(threadid, { threadID: threadid, serverID: guildid })
    }
}

const removeThread = (id, table = "threads") => {
    if(table === "threads") {
        db.deleteThread(id)
        threads.delete(id)
    }
    else {
        db.deleteChannel(id)
        channels.delete(id)
    }
}

module.exports = { removeThread, addThread }