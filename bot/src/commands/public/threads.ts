import { ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, PrivateThreadChannel, PublicThreadChannel, SlashCommandBuilder, ThreadChannel } from "discord.js";
import { addThread, dueArchiveTimestamp, removeThread, setArchive } from "../../utilities/threadActions";
import { Command, statusType } from "../../interfaces/command";
import { threads, config } from "../../bot";

const info: Command = {
    run: async (interaction: ChatInputCommandInteraction, buildBaseEmbed) => {
        buildBaseEmbed("Command Moved", statusType.info, { description: "the `/threads` command has been moved to `/list`" })
    },
    data: new SlashCommandBuilder()
        .setName("threads")
        .setDescription("depracated")
}

export default info