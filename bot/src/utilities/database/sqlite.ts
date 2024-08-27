import { ChannelData, Database, ThreadData } from "src/interfaces/database";
import sql, { Database as sqliteDatabase } from "better-sqlite3";
import { ConfigFile } from "../cnf";
import { join } from "path";
import { getBackupName } from "./DatabaseManager";

// This typename is inappropriate but honestly I dont care.
// I am angry at the typechecker grrrrrrrrrrr
// also i am angry at discord user lizard grrrrrrrrrr
interface AssType extends Omit<ChannelData, "tags" | "roles"> {
  tags: string;
  roles: string;
}

class sqlite implements Database {
  db: sqliteDatabase;

  constructor(config: ConfigFile) {
    const dbPath = join(config.database.options.dataLocation, "data.db");
    this.db = sql(dbPath);
  }

  createTables(): Promise<void> {
    return new Promise((resolve) => {
      this.db
        .prepare(
          "CREATE TABLE IF NOT EXISTS threads (id TEXT PRIMARY KEY, server TEXT, dueArchive INTEGER, watching INTEGER)",
        )
        .run();
      this.db
        .prepare(
          "CREATE TABLE IF NOT EXISTS channels (id TEXT PRIMARY KEY, server TEXT, regex TEXT, roles TEXT, tags TEXT)",
        )
        .run();
      this.db.prepare(
        "CREATE TABLE IF NOT EXISTS blacklist (id TEXT PRIMARY KEY, reason TEXT)",
      );
      // we aint normalising this bitch
      this.db
        .prepare(
          "CREATE TABLE IF NOT EXISTS config (server TEXT, cfg_id TEXT, value TEXT, PRIMARY KEY (server, cfg_id))",
        )
        .run();
      resolve();
    });
  }

  setConfigValue(guildID: string, key: string, value: string): Promise<void> {
    return new Promise((resolve) => {
      this.db
        .prepare("REPLACE INTO config VALUES(?,?,?)")
        .run(guildID, key, value);
      resolve();
    });
  }

  deleteConfigValue(guildID: string, key: string): Promise<void> {
    return new Promise((resolve) => {
      this.db
        .prepare("DELETE FROM config WHERE server = ? AND cfg_id = ?")
        .run(guildID, key);
      resolve();
    });
  }

  getConfigValue(guildID: string, key: string): Promise<string> {
    return new Promise((resolve) => {
      const res = this.db
        .prepare("SELECT * FROM config WHERE server = ? AND cfg_id = ?")
        .get(guildID, key) as { server: string; cfg_id: string; value: string };
      if (!res) return false;
      resolve(res.value);
    });
  }

  insertChannel(data: ChannelData): Promise<void> {
    return new Promise((resolve) => {
      const { id, server, regex, roles, tags } = data;
      this.db
        .prepare("REPLACE INTO channels VALUES(?,?, ?, ?, ?)")
        .run(id, server, regex, roles.join(","), tags.join(","));
      resolve();
    });
  }

  insertThread(id: string, dueArchive: number, guildID: string): Promise<void> {
    return new Promise((resolve) => {
      this.db
        .prepare("REPLACE INTO threads VALUES(?,?,?,1)")
        .run(id, guildID, dueArchive);
      resolve();
    });
  }

  updateDueArchive(id: string, dueArchive: number): Promise<void> {
    return new Promise((resolve) => {
      this.db
        .prepare("UPDATE threads SET dueArchive = ? WHERE id = ?")
        .run(dueArchive, id);
      resolve();
    });
  }

  getChannels(guildID: string): Promise<ChannelData[]> {
    return new Promise((resolve) => {
      const returnArr: ChannelData[] = [];
      returnArr.push(
        ...this.db
          .prepare("SELECT * FROM channels WHERE server = ?")
          .all(guildID)
          .map((i) => {
            const item: AssType = i as AssType;
            const rv: ChannelData = {
              id: item.id,
              server: item.server,
              regex: item?.regex,
              tags: item?.tags.split(","),
              roles: item?.roles.split(","),
            };
            return rv;
          }),
      );
      resolve(returnArr);
    });
  }

  getThreads(guildID: string): Promise<ThreadData[]> {
    return new Promise((resolve) => {
      const returnArr: ThreadData[] = [];
      returnArr.push(
        ...(this.db
          .prepare("SELECT * FROM threads WHERE server = ?")
          .all(guildID) as ThreadData[]),
      );
      resolve(returnArr);
    });
  }

  deleteThread(threadID: string): Promise<void> {
    return new Promise((resolve) => {
      this.db.prepare("DELETE FROM threads WHERE id = ?").run(threadID);
      resolve();
    });
  }

  deleteChannel(channelID: string): Promise<void> {
    return new Promise((resolve) => {
      this.db.prepare("DELETE FROM channels WHERE id = ?").run(channelID);
      resolve();
    });
  }

  deleteGuild(guildID: string): Promise<void> {
    return new Promise((resolve) => {
      this.db.prepare("DELETE FROM channels WHERE server = ?").all(guildID);
      this.db.prepare("DELETE FROM threads WHERE server = ?").all(guildID);
      resolve();
    });
  }

  unwatchThread(threadID: string): Promise<void> {
    return new Promise((resolve) => {
      this.db
        .prepare("UPDATE threads SET watching = 0 WHERE id = ?")
        .run(threadID);
      resolve();
    });
  }

  getNumberOfThreads(): Promise<number> {
    return new Promise((resolve) => {
      const res = this.db.prepare("SELECT COUNT(*) FROM threads;").all();

      let count = res[0];
      if (count) count = Object.values(res[0] as [number, string])[0];
      else count = NaN;

      resolve(count as number);
    });
  }

  getNumberOfChannels(): Promise<number> {
    return new Promise((resolve) => {
      const res = this.db.prepare("SELECT COUNT(*) FROM channels;").all();

      let count = res[0];
      if (count) count = Object.values(res[0] as [number, string])[0];
      else count = NaN;

      resolve(count as number);
    });
  }

  createBackup(baseDir: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const backupPath = `${join(baseDir, getBackupName())}.db`;
      this.db
        .backup(backupPath)
        .then(() => {
          resolve(backupPath);
        })
        .catch(reject);
    });
  }
}

export default sqlite;
