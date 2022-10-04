import { Database } from "better-sqlite3";
import sqlite from "./sqlite";

export enum DataBases {
    sqlite,
    mysql
}

export function getDatabase( type: DataBases, options?: Object ): sqlite {
    switch(type) {
        case DataBases.sqlite:
            return new sqlite()
        break;
    }

    console.log(`could not get a database implementation for "${DataBases[type]}"`)
    process.exit(1)
}