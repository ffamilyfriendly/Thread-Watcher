import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { db } from "../../bot";
import { Command, statusType } from "../../interfaces/command";
import { ChannelData, ThreadData } from "src/interfaces/database";

const escapeCsvValue = (i: string|boolean|number|(string | null | undefined)[]) => {
    const v: string = typeof i === "object" ? i.join(",") : i.toString()
    return v.includes(",") ? `"${v}"` : v
}

const convertToCsv = (d: ThreadData[]|ChannelData[] ) => d.length > 0 ? [ Object.keys(d[0]).join(","), ...d.map((item: ThreadData|ChannelData) => Object.values(item).map(escapeCsvValue).join(",")) ].join("\n") : ""

const reload: Command = {
    run: async (interaction: ChatInputCommandInteraction, buildBaseEmbed) => {

        const guildId = interaction.options.getString("guild")
        if(!guildId) {
            buildBaseEmbed("Error", statusType.error, { description: "no guild id provided" })
            return
        }

        const [ threads, channels ] = await Promise.all([ db.getThreads(guildId), db.getChannels(guildId) ])

        const embed = buildBaseEmbed("Data export", statusType.success, { description: `Here's all the data saved from guild ${guildId}`, noSend: true })

        const files: { name: string, attachment: Buffer }[] = [
            ...threads.length > 0 ? [{ name: `threads_${guildId}.csv`, attachment: Buffer.from(convertToCsv(threads)) }] : [],
            ...channels.length > 0 ? [{ name: `channels_${guildId}.csv`, attachment: Buffer.from(convertToCsv(channels)) }] : []
        ]

        if(files.length === 0) buildBaseEmbed("Not found", statusType.error, { description: `found no data from guild "${guildId}"` })
        else interaction.reply( { embeds: [ embed ], files } )
    },
    gatekeeping: {
        ownerOnly: true,
        devServerOnly: true
    },
    data: new SlashCommandBuilder()
        .setName("export")
        .setDescription("export saved data pertaining to selected guild")
        .addStringOption((o) => 
            o
            .setName("guild")
            .setDescription("what guild you want to get data from")
            .setRequired(true)
        )
}

export default reload