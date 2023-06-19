import { config, logger, webLog } from "../../index";
import { schedule } from "node-cron"
import { databaseInstance } from "../database/DatabaseManager";
import { join } from "path";
import { existsSync, mkdirSync, readdirSync, rmSync, lstatSync } from "fs"



export default function scheduleBackups(database: databaseInstance) {
    if(!config.database.backupInterval) return 
    const backupsDirPath = join(config.database.options.dataLocation, "./backups")

    if(!existsSync(backupsDirPath)) {
        logger.debug(`backup directory does not exist. Creating one`)
        mkdirSync(backupsDirPath)
    }

    schedule(config.database.backupInterval, () => {
        logger.info("running backup")
        database.createBackup(backupsDirPath)
            .then(backupName => {
                logger.done(`Created backup @ ${backupName}!`)
                webLog("Backup Created", `Backup was created at ${backupName}`, "Green")
            })
            .catch(err => {
                logger.error(`backup could not be created`)
                console.log(err)
                webLog("Backup Failed", `Could not create backup.`, "Red")
            })
        
        const fsItems = readdirSync(backupsDirPath).sort().reverse()
        for(const [index, fsItem] of fsItems.entries()) {
            if((index + 1) >= config.database.backupAmount) {
                const fsItemFullPath = join(backupsDirPath, fsItem)
                const fsItemInfo = lstatSync(fsItemFullPath)

                logger.debug(`deleting ${fsItemFullPath}`)
                if(fsItemInfo.isDirectory()) {
                    rmSync(fsItemFullPath, { recursive: true })
                } else {
                    rmSync(fsItemFullPath)
                }
            }
        }
    })
}