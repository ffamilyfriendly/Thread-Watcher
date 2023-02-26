import mysql from "./mysql";
import sqlite from "./sqlite";

export enum DataBases {
    sqlite,
    mysql
}

export function getDatabase( type: DataBases): sqlite|mysql {
    switch(type) {
        case DataBases.sqlite:
            return new sqlite()
        break;
        case DataBases.mysql:
            return new mysql();
        break;
    }

    console.log(`could not get a database implementation for "${DataBases[type]}"`)
    process.exit(1)
}