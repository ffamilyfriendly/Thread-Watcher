import { Guild } from "discord.js";
import { logger } from "../bot";
import { clearGuild } from "../utilities/threadActions";

export default function(guild: Guild) {
    logger.info(`bot left server ${guild.id}. Clearing associated data`)
    clearGuild(guild.id)
}