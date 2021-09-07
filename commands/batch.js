const { threads } = require("../index"),
    { addThread, removeThread } = require("./utils/threadActions")

/**
 * 
 * @param {Discord.TextChannel} channel 
 * @param {string} action 
 * @param {RegExp} pattern 
 */
const batchInChannel = async (channel, action, pattern = null ) => {
    // make sure all threads are in cache
    await channel.threads.fetchActive()
    await channel.threads.fetchArchived()

    const [ reg, blacklist ] = pattern
    channel.threads.cache.each(t => {
        const name = t.name
        const id = t.id
        if(t.parentId != channel.id || ( threads.has(id) && action == "watch" ) || reg ? blacklist ? name.match(reg) : !name.match(reg) : false) return
        if(action == "watch") {
            addThread(id, channel.guildId)
            if(t.archived) t.setArchived(false, "automatic")
        } removeThread(id)
    })
}

const run = (client, data, respond) => {
    const parent = data.data.resolved.channels[Object.keys(data.data.resolved.channels)[0]]
    if([11, 12, 13, 6, 2, 1].includes(parent.type)) return respond("❌ Issue", "that channel type cannot hold threads", "#ff0000")
    let [ action, _p, pattern ] = data.data.options.map(o => o.value)
    const pChannel = client.channels.cache.get(_p)
    let blacklist = false
    if(pattern?.startsWith("!")) { blacklist = true; pattern = pattern.substr(1) }
    if(pattern) {
        if(pattern.match(/^[a-zA-Z0-9_\*!]{0,100}$/gm)) pattern = RegExp(pattern.replace("*", "\\w*"))
        else return respond("❌ Issue", `your pattern "${pattern}" includes forbidden characters`, "#ff0000")
    }

    if(pChannel.type == "GUILD_CATEGORY") {
        pChannel.children.forEach( child => batchInChannel(child, action, [ pattern, blacklist ]))
    } else batchInChannel(pChannel, action, [ pattern, blacklist ])
    respond("👌 Done", "bot used batch action")
}

module.exports = { run }