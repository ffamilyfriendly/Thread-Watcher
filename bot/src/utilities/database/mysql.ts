import { ChannelData, Database, ThreadData } from "../../interfaces/database";
import { Connection, createConnection } from "mysql";
import { ConfigFile } from "../cnf";
import mysqldump from "mysqldump";
import { join } from "path";
import { getBackupName } from "./DatabaseManager";

class mysql implements Database {
  connection: Connection;
  database: string;
  private connDetails: {
    host: string;
    user: string;
    password: string;
    database: string;
  };

  constructor(config: ConfigFile) {
    const { host, user, password, database } = config.database.options;

    this.database = database;
    this.connDetails = { host, user, password, database };
    this.connection = createConnection({
      host,
      user,
      password,
      database,
    });
  }

  createTables(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.connection.connect(async (err) => {
        if (err) {
          console.log(err);
          reject(err);
        }

        this.connection.query(
          `CREATE TABLE IF NOT EXISTS \`${this.database}\`.\`threads\` (\`id\` VARCHAR(20) NOT NULL, \`server\` VARCHAR(20) NOT NULL, \`dueArchive\` INT NOT NULL, watching BOOLEAN, PRIMARY KEY (\`ID\`));`,
          (err) => {
            if (err) {
              console.error("[MYSQL] could not create table threads", err);
              process.exit(1);
            }
            this.connection.query(
              `CREATE TABLE IF NOT EXISTS \`${this.database}\`.\`channels\` (\`id\` VARCHAR(20) NOT NULL, \`server\` VARCHAR(20) NOT NULL, \`regex\` TINYTEXT, \`roles\` TEXT, \`tags\` TEXT);`,
              (err) => {
                if (err) {
                  console.error("[MYSQL] could not create table channels", err);
                  process.exit(1);
                }
                this.connection.query(
                  `CREATE TABLE IF NOT EXISTS \`${this.database}\`.\`config\` (\`server\` VARCHAR(20) NOT NULL, \`cfg_id\` VARCHAR(20) NOT NULL, \`value\` VARCHAR(20) NOT NULL, PRIMARY KEY(\`server\`, \`cfg_id\`))`,
                  (err) => {
                    if (err) {
                      console.error(
                        "[MYSQL] could not create table config",
                        err,
                      );
                      process.exit(1);
                    }
                    resolve();
                  },
                );
              },
            );
          },
        );
      });
    });
  }

  setConfigValue(guildID: string, key: string, value: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.connection.query(
        "INSERT INTO config VALUES(?,?,?)",
        [guildID, key, value],
        (err) => {
          if (err) return reject(err);
          resolve();
        },
      );
    });
  }

  deleteConfigValue(guildID: string, key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.connection.query(
        "DELETE FROM config WHERE server = ? AND cfg_id = ?",
        [guildID, key],
        (err) => {
          if (err) return reject(err);
          resolve();
        },
      );
    });
  }
  getConfigValue(guildID: string, key: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.connection.query(
        "SELECT * FROM config WHERE server = ? AND cfg_id = ?",
        [guildID, key],
        (err, res: { server: string; cfg_id: string; value: string }[]) => {
          if (err) return reject(err);
          if (res && res[0]) return resolve(res[0]["value"]);
          return false;
        },
      );
    });
  }

  insertChannel(data: ChannelData): Promise<void> {
    return new Promise((resolve, reject) => {
      const { id, server, regex, roles, tags } = data;
      this.connection.query(
        "INSERT INTO channels VALUES(?,?,?,?,?)",
        [id, server, regex, roles.join(","), tags.join(",")],
        (err) => {
          if (err) return reject(err);
          resolve();
        },
      );
    });
  }

  insertThread(id: string, dueArchive: number, guildID: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.connection.query(
        "REPLACE INTO threads VALUES(?,?,?,true)",
        [id, guildID, dueArchive],
        (err) => {
          if (err) return reject(err);
          resolve();
        },
      );
    });
  }

  updateDueArchive(id: string, dueArchive: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.connection.query(
        "UPDATE threads SET dueArchive = ? WHERE id = ?",
        [dueArchive, id],
        (err) => {
          if (err) return reject(err);
          resolve();
        },
      );
    });
  }

  /**
     * 
     *             returnArr.push( ...this.db.prepare("SELECT * FROM channels WHERE server = ?").all(guildID).map( item => {
                let rv: ChannelData = { id: item.id, server: item.server, regex: item?.regex, tags: item?.tags.split(","), roles: item?.roles.split(",") };
                return rv
            }) )
     * 
     * @param data 
     * @returns 
     */

  getChannels(guildID: string): Promise<ChannelData[]> {
    interface rawChannelData {
      id: string;
      server: string;
      regex?: string;
      roles?: string;
      tags?: string;
    }

    return new Promise((resolve, reject) => {
      const returnArr: ChannelData[] = [];
      this.connection.query(
        "SELECT * FROM channels WHERE server = ?",
        [guildID],
        (err, res: rawChannelData[]) => {
          if (err) reject(err);

          for (const row of res)
            returnArr.push({
              id: row.id,
              server: row.server,
              regex: row.regex || "",
              tags: row.tags?.split(",") || [],
              roles: row.roles?.split(",") || [],
            });

          return resolve(returnArr);
        },
      );
    });
  }

  getThreads(guildID: string): Promise<ThreadData[]> {
    return new Promise((resolve, reject) => {
      this.connection.query(
        "SELECT * FROM threads WHERE server = ? AND watching = 1",
        [guildID],
        (err, res) => {
          if (err) reject(err);
          return resolve(res);
        },
      );
    });
  }

  deleteThread(threadID: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.connection.query(
        "DELETE FROM threads WHERE id = ?",
        [threadID],
        (err, res) => {
          if (err) reject(err);
          return resolve(res);
        },
      );
    });
  }

  deleteChannel(channelID: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.connection.query(
        "DELETE FROM channels WHERE id = ?",
        [channelID],
        (err, res) => {
          if (err) reject(err);
          return resolve(res);
        },
      );
    });
  }

  deleteGuild(guildID: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const promises = [];
      promises.push(
        this.connection.query("DELETE FROM channels WHERE server = ?", [
          guildID,
        ]),
      );
      promises.push(
        this.connection.query("DELETE FROM threads WHERE server = ?", [
          guildID,
        ]),
      );
      Promise.all(promises)
        .then(() => resolve())
        .catch(reject);
    });
  }

  unwatchThread(threadID: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.connection.query(
        "UPDATE threads SET watching = 0 WHERE id = ?",
        [threadID],
        (err, res) => {
          if (err) reject(err);
          return resolve(res);
        },
      );
    });
  }

  getNumberOfThreads(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.connection.query("SELECT COUNT(*) FROM threads;", (err, res) => {
        if (err) reject(err);
        let count = res[0];
        if (count) count = Object.values(res[0])[0];
        else count = NaN;

        return resolve(count);
      });
    });
  }

  getNumberOfChannels(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.connection.query("SELECT COUNT(*) FROM channels;", (err, res) => {
        if (err) reject(err);
        let count = res[0];
        if (count) count = Object.values(res[0])[0];
        else count = NaN;

        return resolve(count);
      });
    });
  }

  createBackup(baseDir: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const backupPath = `${join(baseDir, getBackupName())}.db`;
      mysqldump({
        connection: this.connDetails,
        dumpToFile: backupPath,
        compressFile: false,
      })
        .then(() => {
          resolve(backupPath);
        })
        .catch(reject);
    });
  }
}

export default mysql;
