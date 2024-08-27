import { Database } from "../interfaces/database";

export default class UserSettings {
  db: Database;
  cache: Map<string, string>;

  constructor(db: Database) {
    this.db = db;
    this.cache = new Map();
  }

  getSetting(guild: string, key: string) {
    return new Promise((resolve, reject) => {
      if (this.cache.has(`${guild}/${key}`)) {
        return resolve(this.cache.get(`${guild}/${key}`));
      }
      this.db
        .getConfigValue(guild, key)
        .then((d) => {
          this.cache.set(`${guild}/${key}`, d);
        })
        .catch((e) => {
          if (e === "NO ROW FOUND") {
            //TODO: FIX THIS
            // IF YOU RUN INTO UD IN THE FUTURE THIS MIGHT BE A CULPRIT
            resolve("");
          } else {
            reject(e);
          }
        });
    });
  }

  async setSetting(guild: string, key: string, value: string) {
    this.db.setConfigValue(guild, key, value);

    if (this.cache.has(`${guild}/${key}`)) {
      this.cache.set(`${guild}/${key}`, value);
    }
  }

  async removeSetting(guild: string, key: string) {
    this.db.deleteConfigValue(guild, key);
  }
}
