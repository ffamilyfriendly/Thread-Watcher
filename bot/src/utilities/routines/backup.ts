import { config, logger, webLog } from "../../index";
import { schedule } from "node-cron";
import {
  BackupProviders,
  databaseInstance,
  getBackupProvider,
} from "../database/DatabaseManager";
import { join } from "path";
import { existsSync, mkdirSync, readdirSync, rmSync, lstatSync } from "fs";

export default function scheduleBackups(database: databaseInstance) {
  if (!config.database.backupInterval) return;
  const backupsDirPath = join(
    config.database.options.dataLocation,
    "./backups",
  );

  if (!existsSync(backupsDirPath)) {
    logger.debug("backup directory does not exist. Creating one");
    mkdirSync(backupsDirPath);
  }

  schedule(config.database.backupInterval, () => {
    logger.info("running backup");
    database
      .createBackup(backupsDirPath)
      .then(async (backupName) => {
        logger.done(`Created backup @ ${backupName}!`);

        let backupLocation = "";

        try {
          if (config.database.backupProvider != "none") {
            const provider = getBackupProvider(
              BackupProviders[config.database.backupProvider],
              config,
            );

            if (provider) {
              const res = await provider.createBackup(backupName);
              if (res) {
                backupLocation = `\n**url:** ${res}`;
              }
            }
          }
        } catch (err) {
          webLog(
            "Backup Delivery Error",
            `Backup was created but could not be saved\n\`${err}\``,
            "Red",
          );
          console.error(err);
        }

        webLog(
          "Backup Created",
          `Backup was created at ${backupName}${backupLocation}`,
          "Green",
        );
      })
      .catch((err) => {
        logger.error("backup could not be created");
        console.error(err);
        webLog("Backup Failed", "Could not create backup.", "Red");
      });

    const fsItems = readdirSync(backupsDirPath).sort().reverse();
    for (const [index, fsItem] of fsItems.entries()) {
      if (index + 1 > config.database.backupAmount) {
        const fsItemFullPath = join(backupsDirPath, fsItem);
        const fsItemInfo = lstatSync(fsItemFullPath);

        logger.debug(`deleting ${fsItemFullPath}`);
        if (fsItemInfo.isDirectory()) {
          rmSync(fsItemFullPath, { recursive: true });
        } else {
          rmSync(fsItemFullPath);
        }
      }
    }
  });
}
