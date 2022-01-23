module.exports = {
    token: "SECRETTTT",
    topggToken: "", // keep empty if bot is not uploaded to top.gg. Get api key at https://top.gg/bot/BOT ID HERE/webhooks
    database: {
        // currently supported: sqlite, mysql
        // to add supported copy /utils/db/example.js, rename it to your_db.js and make sure all the required functions from example.js work
        // if sqlite, connectionOptions is not needed
        use: "sqlite",
        connectionOptions: {
            user: "",
            password: "",
            host: "",
            port: 3306,
            database: "threadwatcher" // this database name is hardcoded. You'd have to change the source code if you want to use another name
        }
    },
    stats: {
        enabled: true,
        port: 2003
    },
    owners: [ "286224826170081290" ],
    applicationId: "592814450084675594",
    invite: "https://discord.com/oauth2/authorize?client_id=870715447136366662&scope=bot%20applications.commands&permissions=122406571008",
}