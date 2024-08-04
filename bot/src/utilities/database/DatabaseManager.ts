import { ConfigFile } from "../cnf";
import DiscordMessage from "./backup/discord";
import mysql from "./mysql";
import sqlite from "./sqlite";

export enum DataBases {
    sqlite,
    mysql
}

export enum BackupProviders {
    none,
    discord
}

export type databaseInstance = sqlite|mysql

export function getBackupName(): string {
    const now = new Date()
    const pad = ( n: number ) => n.toString().padStart(2, "0")
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}@${pad(now.getHours())}.${pad(now.getMinutes())}`
}

export function getDatabase(type: DataBases, config: ConfigFile): sqlite|mysql {
    // I could probably return a proxy obj of the database instance
    // and handle cache like that and ditch the cache collection which
    // would allow me to just use db.whatever anywhere without worrying about cache
    // but this feels complex and not needed. Keeping comment in here for later
    
    switch(type) {
        case DataBases.sqlite:
            return new sqlite(config)
        break;
        case DataBases.mysql:
            return new mysql(config);
        break;
    }

    console.log(`could not get a database implementation for "${DataBases[type]}"`)
    process.exit(1)
}

export function getBackupProvider(type: BackupProviders, config: ConfigFile): DiscordMessage|undefined {
    console.log("TYPE", type)
    console.log("PROVIDERS", BackupProviders)
    if(type == BackupProviders.discord) return new DiscordMessage(config)
}