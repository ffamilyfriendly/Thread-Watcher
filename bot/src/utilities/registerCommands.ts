import { Command } from "src/interfaces/command";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "fs";
import path from "path";
import { REST, Routes } from "discord.js";
import { ConfigFile } from "./cnf";
import { createHash } from "crypto";

/*
    Yes, this is indeed the same code as in loadCommands.
    The reason it is imported again is because if i import it here the code is somehow
    consumed by the dependancy gods and unavailible to the bot.ts file. I have no
    fucking (pardon my french) clue why this is but if you do, PLEASE, submit a PR.
    I am at the end of my wits here
*/

const loadCommands = (baseDir = "../dist/commands/", dirDive = "") => {

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
            const { run, data, externalOptions, gatekeeping } = cmdReq
            if(!run || !data) console.warn(`"${baseDir}${dirDive}${file}" is not an acceptable command file. Missing: ${run ? "" : "function \"run\""} ${data ? "" : "property \"data\""}`) 
            else {
                if(gatekeeping?.devServerOnly) {
                    prCommands.push( { run, data, externalOptions } )
                } else pCommands.push( { run, data, externalOptions } )
            }
        } else if(fileStat.isDirectory()) {
            const { publicCommands, privateCommands } = loadCommands(baseDir, dirDive + `${file}/`)
            pCommands.push(...publicCommands)
            prCommands.push(...privateCommands)
        }
    }
    return { publicCommands: pCommands, privateCommands: prCommands }
}

export default function( global: Boolean, config: ConfigFile ): Promise<unknown> {
    const { publicCommands, privateCommands } = loadCommands("../commands/")
    if(!global && !config.devServer) {
        console.warn("-reg_commands was used with the -local flag but no dev server is specified in config.\nPlease edit the config to include the id of your development server or remove the -local flag to register commands globally")
        return new Promise((_res, rej) => rej("no dev server specified in config"))
    }
    console.log(`Registering commands ${ global ? "globally" : `on your server (${config.devServer})` }`)
    console.log(`Global commands:\n${publicCommands.map(c => c.data.name).join(", ")}\nLocal commands:\n${privateCommands.map(c => c.data.name).join(", ")}`)
    
    if(!global && config.devServer) {
        privateCommands.push(...publicCommands)
        // This line is absolutely haram but this works in js lol
        publicCommands.length = 0;
    }

    const rest = new REST({ version: "10" }).setToken(config.tokens.discord)

    const commandToJson = (cmd: Command) => {
        let data = cmd.data.toJSON()
        if(cmd.externalOptions) data.options?.push( ...cmd.externalOptions )
        return data
    }

    let promises = []

    if(publicCommands.length >= 1) {
        const promise = rest.put(
            Routes.applicationCommands(config.clientID),
            { body: Array.from(publicCommands.values()).map(commandToJson) }
        )
        promises.push(promise)
    }

    if(privateCommands.length >= 1) {
        const promise = rest.put(
            Routes.applicationGuildCommands(config.clientID, config.devServer),
            { body: Array.from(privateCommands.values()).map(commandToJson) }
        )
        promises.push(promise)
    }

    return Promise.all(promises)
}

export function clearCommands(local: Boolean, config: ConfigFile) {
    return new Promise((resolve, reject) => {
        const rest = new REST({ version: "10" }).setToken(config.tokens.discord)
        const route = local ? Routes.applicationGuildCommands(config.clientID, config.devServer) : Routes.applicationCommands(config.clientID)
        rest.put(route, { body: [] })
            .then(resolve)
            .catch(reject)
    })
}

export function genCommandHash( writeToFile = true ): string {
    const { publicCommands, privateCommands } = loadCommands("../commands/")
    const hash = createHash("sha256")
    
    for(const command of [...publicCommands, ...privateCommands]) {
        const commandInfo = `${JSON.stringify(command.data)}:${JSON.stringify(command.externalOptions ?? "")}`
        hash.update(commandInfo)
    }

    const digest = hash.digest("base64")

    if(writeToFile) {
        writeFileSync("./.commandshash", digest)
    }

    return digest
}

export function checkCommandChange(): boolean {
    const oldHashPath = path.join(__dirname, "../../.commandshash")

    const oldHash = existsSync(oldHashPath) ? readFileSync(oldHashPath, "utf8") : Buffer.from("file does not exist").toString("base64")
    const currentHash = genCommandHash()

    return oldHash === currentHash
}