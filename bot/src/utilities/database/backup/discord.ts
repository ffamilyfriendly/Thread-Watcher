import { statSync } from "fs";
import { BackupProvider } from "../../../interfaces/database";
import { WebhookClient } from "discord.js";
import { ConfigFile } from "../../../utilities/cnf";

export default class DiscordMessage implements BackupProvider {
  private webhookClient: WebhookClient;

  constructor(config: ConfigFile) {
    if (!config.logWebhook) throw new Error("no webhook url set!");
    this.webhookClient = new WebhookClient({ url: config.logWebhook });
  }

  createBackup(path: string): Promise<`https://${string}` | null> {
    return new Promise((resolve, reject) => {
      const file = statSync(path);
      const fileSizeInMib = file.size / 1000000.0;

      if (!file.isFile())
        return reject(Error("path does not resolve in a file"));
      if (fileSizeInMib > 25)
        return reject(Error("file size is larger than allowed (>25Mib)"));
      if (!this.webhookClient)
        return reject(Error("no webhook client has been initiated."));

      this.webhookClient.send({ files: [path], username: "Backup Provider" });
      resolve(null);
    });
  }
}
