import { BaseInteraction } from "discord.js";
import { logger } from "../bot";

export default function(interaction: BaseInteraction) {
    console.log(interaction)
    logger.info(`Client ready on`)
}