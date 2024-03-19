import { ShardingManager } from "discord.js";
import express from "express";
import { config } from "../index";
import { databaseInstance } from "../utilities/database/DatabaseManager";
import { logger } from "./../index";
const app = express()

const getStats = async (m: ShardingManager) => {
    const promises = [
        m.broadcastEval(c => c.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)),
        m.broadcastEval(client => [client.shard?.ids, client.ws.status, client.ws.ping, client.uptime, client.guilds.cache.size])
    ]

    const res = await Promise.all(promises)
    
    let userCount = 0
    for(const gc of res[0]) {
        if(typeof gc === "number") userCount += gc
    }
    
    return { userCount, shards: res[1] }
}

function getTopggVotes(): Promise<number> {
    return new Promise((resolve, reject) => {
        fetch(`https://top.gg/api/bots/${config.clientID}`, { headers: [ [ "Authorization", config.tokens.topgg ] ] })
        .then(res => {
            res.json()
                .then(res => {
                    if(res && res.points && typeof res.points === "number") resolve(res.monthlyPoints)
                })
                .catch(e => reject(e))
        })
        .catch(e => reject(e))
    })
}

let started = false

export default function start(manager: ShardingManager, port: number, database: databaseInstance) {
    if(started) return

    type statsData = {
        guildCount: number,
        userCount: number
        shards: { id: number, status: number, ping: number, uptime: number, guilds: number }[],
        threads: number,
        channels: number,
        votes: number
    }

    let stats: statsData = {
        guildCount: 0,
        userCount: 0,
        threads: 0,
        channels: 0,
        votes: 0,
        shards: [ ]
    }

    let timesRan = 0

    const statsFunc = () => {
        if(timesRan % 2 === 0 && config.tokens.topgg.length > 0) {
            getTopggVotes()
                .then(r => {
                    stats.votes = r
                })
                .catch(e => {
                    console.warn("could not get top.gg votes", e)
                })
        }

        database.getNumberOfThreads()
            .then(r => {
                stats.threads = r
            })

        database.getNumberOfChannels()
            .then(r => {
                stats.channels = r
            })

        getStats(manager).then(r => {
            stats.userCount = r.userCount

            stats.guildCount = 0
            stats.shards = []
            for(const shard of r.shards) {
                if(!(shard instanceof Array) || shard.length !== 5) continue;
                if(typeof shard[4] === "number") stats.guildCount += shard[4]
                stats.shards.push({
                    id: (shard[0] instanceof Array) ? shard[0][0] : 0,
                    status: typeof shard[1] === "number" ? shard[1] : 0,
                    ping:   typeof shard[2] === "number" ? shard[2] : 0,
                    uptime: typeof shard[3] === "number" ? shard[3] : 0,
                    guilds: typeof shard[4] === "number" ? shard[4] : 0
                })
            }
        })
        timesRan += 1
    }

    setTimeout(statsFunc, 1000)
    setInterval(statsFunc, 1000 * 60)

    app.get("/getShard", (req, res) => {
        const { guild } = req.query
        if(!guild || typeof guild !== "string") return res.status(400).send("missing param guild")
        if(guild.length > 20 || guild.length < 17 || !guild.match(/^\d+$/gi)) return res.status(400).send("invalid guild id")

        manager.broadcastEval((c, { guildId }) => [c.shard?.ids, c.guilds.cache.has(guildId)], { context: { guildId: guild } })
        .then((result) => {
            for(const row of result) {
                const shardId: number = row[0] instanceof Array ? row[0][0] : 69

                if(typeof row[1] === "boolean" && row[1]) {
                    return res.send({ found: true, shard: shardId })
                }
            }
            return res.json({ found: false, shard: -1 })
        })
        .catch(() => {
            res.status(500).send("something went wrong")
        })
    })

    app.get("/stats", (req, res) => {
        res.json(stats)
    })

    app.listen(port, () => {
        logger.done(`listening on port ${port}`)
        started = true
    })
}