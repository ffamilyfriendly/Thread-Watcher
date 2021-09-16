const { threads, channels, db } = require("../../index")

const addThread = ( threadid, guildid, table = "threads" ) => {
    if(threads.has(threadid)) return
    db.prepare(`INSERT INTO ${table} VALUES(?,?)`).run(threadid,guildid)
    if(table == "threads") threads.set(threadid, { threadID: threadid, serverID: guildid })
    else channels.set(threadid, { threadID: threadid, serverID: guildid })
}

const removeThread = (id, table = "threads") => {
    db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id)
    if(table == "threads") threads.delete(id)
    else channels.delete(id)
}

module.exports = { removeThread, addThread }