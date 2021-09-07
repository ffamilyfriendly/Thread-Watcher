const db = require("../index").db

const run = (client, data, respond) => {
    let threadsList = db.prepare("SELECT * FROM threads WHERE server = ?").all(data.guild_id)
    respond("Threads the bot is watching", `${threadsList.map(t => `<#${t.id}>`).join(", ")}`.substr(0, 2000) || "no threads are being watched", "#008000")
}

module.exports = { run }