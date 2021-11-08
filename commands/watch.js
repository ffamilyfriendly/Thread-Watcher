const threads = require("../index").threads,
    { addThread, removeThread } = require("./utils/threadActions")

const run = (client, data, respond) => {
    const thread = data.data.resolved.channels[Object.keys(data.data.resolved.channels)[0]]

    if(threads.has(thread.id)) { 
        try {
            removeThread(thread.id)
            respond("👌 Done", `bot will no longer keep <#${thread.id}> un-archived`)
        } catch(err) {
            respond("❌ Issue", "Bot failed to remove thread from database. Sorry about that")
        }
    } else {
        try {
            addThread(thread.id, data.guild_id)
            respond("👌 Done", `Bot will make sure <#${thread.id}> is un-archived`)
        } catch(err) {
            console.error(err)
            respond("❌ Issue", "Bot failed to add thread to watchlist. Sorry about that", "#ff0000")
        }
    }
}

module.exports = { run }
