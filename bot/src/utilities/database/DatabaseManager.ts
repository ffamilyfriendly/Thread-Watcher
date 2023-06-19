import { ConfigFile } from "../cnf";
import mysql from "./mysql";
import sqlite from "./sqlite";

export enum DataBases {
    sqlite,
    mysql
}

export type databaseInstance = sqlite|mysql

export function getBackupName(): string {
    const now = new Date()
    const pad = ( n: number ) => n.toString().padStart(2, "0")
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}@${pad(now.getHours())}.${pad(now.getMinutes())}`
}

export function getDatabase(type: DataBases, config: ConfigFile): sqlite|mysql {
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