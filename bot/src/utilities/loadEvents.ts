import { Client } from "discord.js"
import { readdirSync } from "fs"

export default function(client: Client) {
    readdirSync("./dist/events").forEach( file => {
        if(file.endsWith(".js")) {
            const cmd = require(`../events/${file}`).default
            client.addListener(file.split(".")[0], cmd)
        }
    } )
}