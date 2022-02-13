const c = require("../utils/clog.js"),
    { logger } = require("../utils/clog.js"),
    { client } = require("../index")
const { removeThread } = require("../utils/threadActions.js")

const logOpts = {
    total: 0,
    done: 0,
    freq: 0
}

const incr = () => {
    logOpts.done++
    const logEvery = 30
    // status for every nth thread. Would get cluttery if we logged every thread
    if(logOpts.done % logEvery === 0) logger.info(`checking threads | ${logOpts.done}/${logOpts.total} | ETA: ${((logOpts.total * logOpts.freq) / 1000 - (logOpts.done * logOpts.freq) / 1000).toFixed(2)}s | ${(logOpts.done/logOpts.total * 100).toFixed(1)}% done`)
}

/*
    Moved this code over to d.js meaning there will be no more ugly raw api calls!
    hopefully this works better than my old solution

    extra thanks to @PlavorSeol for helping me get over my stubborness to make things harder for myself and for being a cool dude in general
*/

/**
 * @param {Map} map
 * @returns {Promise}
 */
const getAllArchivedThreads = (map) => {
    // 1000 represents a second, 20 represents how many requests we want to do in that time. I set it as 20 instead of 50 to give some leeway
    // ^ even though d.js handles ratelimits I'll keep this code to give some extra security against discord ratelimiting my network... again
    const freq = 1000 / 20
    logOpts.freq = freq
    let i = 0
    return new Promise(async (resolve, reject) => {
        for(let [key, value] of map) {
            try {
                setTimeout(() => {
                    client.channels.fetch(key)
                        .then(thread => {
                            if(thread.sendable && !thread.locked && thread.archived) {
                                thread.setArchived(false)
                            }
                            incr()
                        })
                        .catch(err => {
                            logger.error(`issue with thread ${key}: ${JSON.stringify(err)}}`)
                            if(err.message === "Unknown Channel") removeThread(key)
                            incr()
                        })
                }, freq * i)
                if(i == map.size - 1) {
                    resolve()
                }
                i++
            } catch(err) {
                logger.error(`issue with thread ${key}: ${JSON.stringify(err)}`)
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
    logOpts.total = map.size
    getAllArchivedThreads(map)
    .then(() => {
        c.log(`Thread routine done!`)
    })
}

module.exports = { run }