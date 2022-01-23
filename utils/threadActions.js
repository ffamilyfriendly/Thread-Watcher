const { threads, channels, db } = require("../index.js")

const addThread = ( threadid, guildid, table = "threads" ) => {
    if(threads.has(threadid)) return
    if(table === "threads"){
        db.insertThread(threadid, guildid)
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