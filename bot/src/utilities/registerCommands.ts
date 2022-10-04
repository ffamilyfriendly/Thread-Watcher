import config from "../config";
import { Command } from "src/interfaces/command";
import { readdirSync, statSync } from "fs";
import path from "path";
import { REST, Routes } from "discord.js";

/*
    Yes, this is indeed the same code as in loadCommands.
    The reason it is imported again is because if i import it here the code is somehow
    consumed by the dependancy gods and unavailible to the bot.ts file. I have no
    fucking (pardon my french) clue why this is but if you do, PLEASE, submit a PR.
    I am at the end of my wits here
*/

const loadCommands = (baseDir: string = "../dist/commands/", dirDive: string = "") => {

    let pCommands: Command[] = []
    let prCommands: Command[] = []


    const p = path.join(__dirname, baseDir + (dirDive ? dirDive : ""))
    for(let file of readdirSync(p)) {
        const fileStat = statSync(path.join(p, file))
        if(fileStat.isFile() && file.endsWith(".js")) {
            const cmdReq = require(`../commands/${dirDive}/${file}`)?.default
            if(!cmdReq) {
                console.warn(`"${baseDir}${dirDive}${file}" command does not export a default object`)
                continue;
            }
            const { run, data } = cmdReq
            if(!run || !data) console.warn(`"${baseDir}${dirDive}${file}" is not an acceptable command file. Missing: ${run ? "" : "function \"run\""} ${data ? "" : "property \"data\""}`) 
            else {
                if(data?.gatekeeping?.devServerOnly) {
                    prCommands.push( { run, data } )
                } else pCommands.push( { run, data } )
            }
        } else if(fileStat.isDirectory()) {
            const { publicCommands, privateCommands } = loadCommands(baseDir, dirDive + `${file}/`)
            pCommands.push(...publicCommands)
            prCommands.push(...privateCommands)
        }
    }
    return { publicCommands: pCommands, privateCommands: prCommands }
}

export default function( global: Boolean ) {
    const { publicCommands, privateCommands } = loadCommands("../commands/")
    if(!global && !config.devServer) return console.warn(`-reg_commands was used with the -local flag but no dev server is specified in config.\nPlease edit the config to include the id of your development server or remove the -local flag to register commands globally`)
    console.log(`Registering commands ${ global ? "globally" : `on your server (${config.devServer})` }`)
    
    if(!global && config.devServer) {
        privateCommands.push(...publicCommands)
        // This line is absolutely haram but this works in js lol
        publicCommands.length = 0;
    }

    const rest = new REST({ version: "10" }).setToken(config.tokens.discord)

    if(publicCommands.length >= 1) {
        rest.put(
            Routes.applicationCommands(config.clientID),
            { body: Array.from(publicCommands.values()).map(r => r.data.toJSON()) }
        )
    }

    if(privateCommands.length >= 1) {
        rest.put(
            Routes.applicationGuildCommands(config.clientID, config.devServer),
            { body: Array.from(privateCommands.values()).map(r => r.data.toJSON()) }
        )
    }
}