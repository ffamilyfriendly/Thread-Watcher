const c = require("../commands/utils/clog"),
    fetch = require("node-fetch"),
    config = require("../config"),
    { checkIfBotCanManageThread } = require("../index"),
    { removeThread } = require("../commands/utils/threadActions")

/*
    Trying to implement ratelimiting.
    we have 3 interesting headers, namely "x-ratelimit-limit", "x-ratelimit-remaining", and "x-ratelimit-reset"
    we need to make sure not to exceed x-ratelimit-limit within the alloted limit set in "x-ratelimit-limit".
    for now it should be fine to just have a queue of sorts with unarchive requests as I do not expect this bot
    to grow too quickly. If I am wrong in this assesment I will suffer in debug hell but it is what it isssssss

    Edit from 200+ threads: f*ck you, above me
*/

/*
    I might port this over to discord.js. Not sure
*/

let ratelimits = {
    resets: null,
    remaining: 10,
    limit: null
}

const doUnArchive = (id) => {
    fetch(`https://discord.com/api/v9/channels/${id}`, {
        headers: [
            ["Authorization", `Bot ${config.token}`],
            ["User-Agent", "DiscordBot (discord.js,@latest)"],
            ["X-Audit-Log-Reason", "(automatic) un-archive"],
            ["Content-Type", "application/json"]
        ],
        method: "PATCH",
        body: JSON.stringify({
            archived: false
        })
    }).then(res =>  {
        if(res?.status == 403) console.warn(`could not un-archive ${id}`)
        if(res?.status == 429) console.warn("!!RATELIMITS!!", res)
        ratelimits = {
            resets: res.headers.get('x-ratelimit-reset'),
            remaining: res.headers.get('x-ratelimit-remaining'),
            limit: res.headers.get('x-ratelimit-limit')
        }
    } )
}

let unArchiveRequests = []

const handleQueue = () => {
    const thread = unArchiveRequests.shift()
    if(!thread) return
    if(ratelimits.remaining >= 1) { doUnArchive(thread); handleQueue() }
    else {
        setTimeout(() => {
            doUnArchive(thread)
            handleQueue()
        }, (ratelimits.resets - Date.now() / 1000) + 500)
    }
    c.log(`un-archiving ${thread}`)
}

const getThread = (id) => {
    return new Promise((resolve, reject) => {
        fetch(`https://discord.com/api/v9/channels/${id}`, {
            headers: [
                ["Authorization", `Bot ${config.token}`],
                ["User-Agent", "DiscordBot (discord.js,@latest)"]
            ],
            method: "GET"
        }).then(res => res.json())
        .then(thread => {
            if(!thread?.thread_metadata) { removeThread(id); reject(thread) }
            else resolve(thread)
        })
    })
}

const unArchive = (id) => {
    unArchiveRequests.push(id)
    if(unArchiveRequests.length === 1) handleQueue()
}

/**
 * @param {Map} map
 * @returns {Promise}
 */
const getAllArchivedThreads = (map) => {
    // 1000 represents a second, 30 represents how many requests we want to do in that time. I set it as 25 instead of 50 to give some leeway
    const freq = 1000 / 25
    let i = 0
    return new Promise(async (resolve, reject) => {
        for(let [key, value] of map) {
            try {
                setTimeout(() => {
                    getThread(value.threadID)
                    .then(t => {
                        if(t.thread_metadata.archived && checkIfBotCanManageThread(t.guild_id)) unArchive(t.id)
                    })
                    .catch(e => {
                        console.error(`issue with thread ${key}`, e)
                    })
                }, freq * i)
                if(i == map.size - 1) {
                    resolve()
                }
                i++
            } catch(err) {
                c.log(`issue with thread "${key}": ${err}`)
            }
            
        }
    })
}

/**
 * 
 * @param {Map} map 
 */
const run = ( map ) => {
    c.log(`Starting check all threads routine\ntotal threads: ${map.size}`)
    getAllArchivedThreads(map)
    .then(() => {
        c.log(`Thread routine done!`)
    })
}

module.exports = { run }