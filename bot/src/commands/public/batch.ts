import { ChatInputCommandInteraction, Channel, PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder, Embed, ThreadChannel, ChannelType, ColorResolvable, DMChannel, CategoryChannel, TextChannel, ForumChannel, NewsChannel, GuildMember } from "discord.js";
import { Command, statusType } from "../../interfaces/command";
import { db, threads as threadsList } from "../../bot";


const batch: Command = {
    run: async (interaction: ChatInputCommandInteraction, buildBaseEmbed) => {

    },
    data: new SlashCommandBuilder()
        .setName("threads")
        .setDescription("display your watched threads and channels")
        .addBooleanOption((o) => 
            o
            .setName("public")
            .setDescription("do you want this message to be viewable for everyone?")
        )
        .addStringOption((o) =>
            o
            .setName("show")
            .setDescription("do you want to view watched threads or channels?")
            .addChoices({ name: "threads", value: "thread" }, { name: "channels", value: "channel" }, { name: "both", value: "all" })
        )
}

export default batch