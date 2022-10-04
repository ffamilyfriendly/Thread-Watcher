import { Client } from "discord.js";
import { logger } from "../bot";

export default function(client: Client) {
    logger.info(`Client ready! `)
}