import { DataBases } from "./utilities/database/DatabaseManager"

const config = {
    tokens: {
        // The discord token is required for the bot to communicate with the discord api.
        // if you are reading this I have trust that you know the consequences of sharing a access token but on the offchance you dont:
        // !! SHARING THIS TOKEN WITH ANYONE WILL ALLOW THEM TO LOG IN AS YOUR BOT. DO NOT SHARE THIS TOKEN !! 
        // you can get your bot token from https://discord.com/developers/applications/<YOUR BOT ID>/bot
        discord: "SECRET",
        // the topgg token is used to keep bot stats (shard and server count) updated on the site
        // you can get your topgg token from https://top.gg/bot/<YOUR BOT ID>/webhooks (bot will have to be approved by topgg bot reviewers first)
        // leaving this field empty will disable the bot automatically posting top.gg stats
        topgg: ""
    },
    clientID: "",
    database: {
        type: DataBases.sqlite,
        options: {
            user: "",
            password: "",
            host: "",
            port: 1337,
            database: "threadwatcher"
        }
    },
    style: {
        error: {
            colour: "#D00000",
            emoji: "<:statusurgent:960959148848214017>"
        },
        success: {
            colour: "#4C9F70",
            emoji: "<:statusgood:960960196425957447>"
        },
        info: {
            colour: "#197BBD",
            emoji: "<:statusinfo:960960247571300353>"
        },
        warning: {
            colour: "#F18F01",
            emoji: "⚠️"
        }
    },
    // this is a list of discord users allowed to use owner only commands (eval and so forth)
    // only add users you 100% trust to this array as it allows them to run code directly on your host via the eval command
    // (the user listed in the config is me, family friendly. I recomend you replace this id with your own)
    owners: [ "286224826170081290" ],
    
    // a server you own.
    // owner only commands such as eval will be registered on this server
    devServer: "874566459429355581",
    devServerInvite: ""
}

export default config