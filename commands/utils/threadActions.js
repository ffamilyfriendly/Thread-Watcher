const { threads, db } = require("../../index")

const addThread = ( threadid, guildid ) => {
    if(threads.has(threadid)) return
    db.prepare("INSERT INTO threads VALUES(?,?)").run(threadid,guildid)
    threads.set(threadid, { threadID: threadid, serverID: guildid })
}

const removeThread = (id) => {
    db.prepare("DELETE FROM threads WHERE id = ?").run(id)
    threads.delete(id)
}

module.exports = { removeThread, addThread }