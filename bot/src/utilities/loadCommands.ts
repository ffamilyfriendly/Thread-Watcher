import { readdirSync, statSync } from "fs"
import { Command } from "src/interfaces/command"
import { logger } from "../bot"
import path from "path"

const loadCommands = (baseDir: string = "../commands/", dirDive: string = "") => {
    let commands = new Map<string, Command>()
    const p = path.join(__dirname, baseDir + (dirDive ? dirDive : ""))
    for(let file of readdirSync(p)) {
        const fileStat = statSync(path.join(p, file))
        if(fileStat.isFile() && file.endsWith(".js")) {
            const cmdReq = require(`../commands/${dirDive}/${file}`)?.default
            if(!cmdReq) {
                logger.warn(`"${baseDir}${dirDive}${file}" command does not export a default object`)
                continue;
            }
            const { run, data, gatekeeping } = cmdReq
            if(!run || !data) logger.warn(`"${baseDir}${dirDive}${file}" is not an acceptable command file. Missing: ${run ? "" : "function \"run\""} ${data ? "" : "property \"data\""}`) 
            else { commands.set(file.split(".")[0], { run, data, gatekeeping }) }
        } else if(fileStat.isDirectory()) {
            commands = new Map<string, Command>([ ...commands, ...loadCommands(baseDir, dirDive + `${file}/`) ])
        }
    }
    return commands
}

export default loadCommands