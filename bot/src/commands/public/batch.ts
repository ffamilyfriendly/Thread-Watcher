import { ChatInputCommandInteraction, Channel, PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder, Embed, ThreadChannel, ChannelType, ColorResolvable, DMChannel, CategoryChannel, TextChannel, ForumChannel, NewsChannel, GuildMember } from "discord.js";
import { Command, statusType } from "../../interfaces/command";
import { db, threads as threadsList } from "../../bot";


const batch: Command = {
    run: async (interaction: ChatInputCommandInteraction, buildBaseEmbed) => {
        const parent = interaction.options.getChannel("parent") || interaction.channel
    },
    data: new SlashCommandBuilder()
        .setName("batch")
        .setDescription("watch or unwatch multiple threads at once")
        .addStringOption((o) => 
            o
            .setName("action")
            .setDescription("what action to run on selected threads")
            .setChoices(...[ { name: "watch", value:"watch" }, { name: "unwatch", value:"unwatch" }, { name: "toggle", value:"toggle" } ])
            .setRequired(true)
        )
        .addStringOption((o) =>
            o
            .setName("pattern")
            .setDescription("run batch action only on threads which fit this pattern")
        ),
    externalOptions: [
        {
            channel_types: [ 0, 4, 5, 15 ],
            description: "parent whose children will be affected",
            name: "parent",
            type: 7
        }
    ]
}

export default batch