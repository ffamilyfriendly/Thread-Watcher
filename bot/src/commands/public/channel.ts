import { ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, PrivateThreadChannel, PublicThreadChannel, SlashCommandBuilder, ThreadChannel } from "discord.js";
import { addThread, dueArchiveTimestamp, removeThread, setArchive } from "../../utilities/threadActions";
import { Command, statusType } from "../../interfaces/command";
import { threads, config, db } from "../../bot";

const info: Command = {
    run: async (interaction: ChatInputCommandInteraction, buildBaseEmbed) => {
        const channel = interaction.options.getChannel("channel")

        if(!channel) return

        if(interaction.commandName === "add") {
            db.insertChannel({ server: interaction.guildId ?? "", id: channel.id, regex: "", roles: [], tags: [] })
            buildBaseEmbed("Added channel", statusType.success)
        } else {
            db.deleteChannel(channel.id)
            buildBaseEmbed("Removed channel", statusType.success)
        }
    },
    gatekeeping: {
        userPermissions: [ PermissionFlagsBits.ManageThreads ],
        ownerOnly: false,
        devServerOnly: true
    },
    data: new SlashCommandBuilder()
        .setName("channel")
        .setDescription("add and remove channel watches")
        .addSubcommand(sub => 
            sub
                .setName("add")
                .setDescription("add a channel to the watchlist")
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription("the channel or category you want to add")
                        .setRequired(true)
                )
        )
        .addSubcommand(sub => 
            sub
                .setName("remove")
                .setDescription("remove a channel from the watchlist")
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription("the channel or category you want to remove")
                        .setRequired(true)
                )
        )
}

export default info