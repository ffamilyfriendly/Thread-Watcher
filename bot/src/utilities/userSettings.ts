import { Database } from "../interfaces/database";

export default class UserSettings {
  db: Database;
  cache: Map<string, string>;

  constructor(db: Database) {
    this.db = db;
    this.cache = new Map();
  }

  async getSetting(guild: string, key: string) {
    if (this.cache.has(`${guild}/${key}`)) {
      return this.cache.has(`${guild}/${key}`);
    }
    const res = await this.db.getConfigValue(guild, key);

    if (res) {
      this.cache.set(`${guild}/${key}`, res);
    }

    return res;
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
