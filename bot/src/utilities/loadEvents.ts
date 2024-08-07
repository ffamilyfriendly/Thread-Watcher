import { Client } from "discord.js";
import { readdirSync } from "fs";

/**
 *
 * @param client The client to register the events on.
 * @param refresh removes old listener if set to true
 */
export default function (client: Client, refresh = false) {
  readdirSync("./dist/events").forEach((file) => {
    if (file.endsWith(".js")) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const cmd = require(`../events/${file}`).default;
      const eventName = file.split(".")[0];
      if (refresh) client.removeAllListeners(eventName);
      client.on(eventName, cmd);
    }
  });
}
