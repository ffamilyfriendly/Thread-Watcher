const { channels } = require("../index")
const { addThread } = require("../utils/threadActions")

const run = ( client ) => {
    client.on("threadCreate", (thread) => {
        if(channels.has(thread.parentId)) addThread(thread.id, thread.guildId, (Date.now() / 1000) + (thread.autoArchiveDuration * 60))
    })
}

module.exports = { run }