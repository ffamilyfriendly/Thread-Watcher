const channels = require("../index").channels,
    { addThread, removeThread } = require("./utils/threadActions")

const run = (client, data, respond) => {
    const thread = data.data.resolved.channels[Object.keys(data.data.resolved.channels)[0]]
    if(![0,5].includes(thread.type)) return respond("❌ Issue", "The attatched channel needs to be a text channel", "#ff0000")
    if(channels.has(thread.id)) { 
        try {
            removeThread(thread.id, "channels")
            respond("👌 Done", `bot will no longer keep all threads in <#${thread.id}> un-archived`)
        } catch(err) {
            respond("❌ Issue", "Bot failed to remove channel from database. Sorry about that")
        }
    } else {
        try {
            addThread(thread.id, data.guild_id, "channels")
            respond("👌 Done", `Bot will make sure all threads in <#${thread.id}> are un-archived`)
        } catch(err) {
            console.error(err)
            respond("❌ Issue", "Bot failed to add channel to watchlist. Sorry about that", "#ff0000")
        }
    }
}

module.exports = { run }