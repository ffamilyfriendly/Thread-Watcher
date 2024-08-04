import { statSync } from "fs";
import { BackupProvider } from "../../../interfaces/database";
import { EmbedBuilder, WebhookClient } from "discord.js";
import { ConfigFile } from "../../../utilities/cnf";

export default class DiscordMessage implements BackupProvider {
    private webhookClient: WebhookClient

    constructor(config: ConfigFile) {
        if(!config.logWebhook) throw new Error("no webhook url set!")
        this.webhookClient = new WebhookClient({ url: config.logWebhook })
    }

    createBackup(path: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const file = statSync(path)
            const fileSizeInMib = file.size / 1000000.0

            if(!file.isFile())      return reject("path does not resolve in a file")
            if(fileSizeInMib > 25)  return reject("file size is larger than allowed (>25Mib)")
            if(!this.webhookClient) return reject("no webhook client has been initiated.")

            const embed = new EmbedBuilder()
                .setTitle("Database Backup")
                .setTimestamp(new Date())
                .setColor("Aqua")
            
            this.webhookClient.send({ embeds: [ embed ], files: [ path ], username: "Backup Provider" })
        })
    }

} 