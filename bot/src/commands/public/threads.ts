import { ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder, Embed } from "discord.js";
import loadCommands from "../../utilities/loadCommands";
import { commands } from "../../bot";
import { Command, statusType } from "../../interfaces/command";
import reloadCommands from "../../utilities/routines/reloadCommands";
import { threads as threadsList } from "../../bot";

type field = {
    name: string,
    value: string
}

/**
 * This function will split an array of discord channel tags ( <#CHANNEL_ID> ) into embed fields of 1024 chars each
 * as some of yall have a metric tonne of watched threads. 
 * The function also limits the total chars of embed field values to a total of 5500 to not bypass the hardlimit of
 * 6000 chars per embed object.
 * 
 * This might make it now show all threads if any user out there somehow manages to have 5500 chars worth of threads stored
 * which is why this function will be supplemented with a function to create more embeds if needed as 10 embeds are allowed per interaction response
 */
const fitIntoFields = ( name: string, values: string[], totalLength: number = 0 ): { fieldArr: field[], totalLength: number, remainingValues: string[] } => {
    
    // Embed limits https://discord.com/developers/docs/resources/channel#embed-object-embed-limits
    const MAXLENGTH = 1024
    const ALLOWEDLENGTH = 5500
    
    let fields: field[] = []
    let buff: string = ""
    let remainingValues: string[] = []

    for(let index = 0; index < values.length; index++) {

        const value = values[index]

        // Length of the buffer plus the string currently added to it
        const iLength = (buff.length + value.length) + 2
        totalLength += value.length + 2

        /**
         * if the total length of chars in this embed exceeds the per embed hard limit we will 
         * return the left over values so they can be displayed in another embed
         */
        if(totalLength >= ALLOWEDLENGTH) {
            remainingValues = values.splice(index)
            break;
        }

        /**
         * ensure the current thread can fit into the current field (buff).
         * If not: push the current field into the array and initiate a new one with the current value
         */
        if(iLength > MAXLENGTH) {
            fields.push( { name: `${name} ${fields.length + 1}`, value: buff.substring(0, buff.length-2) } )
            buff = `${value}, `
        } else {
            buff += `${value}, `
        }
    }

    fields.push( { name: `${name} ${fields.length + 1}`, value: buff.substring(0, buff.length-2) } )

    return { fieldArr: fields, totalLength, remainingValues }
}

/**
 * This function will generate as many embeds as are needed to show all watched items
 * without hitting the limits described above. A maxiumum of 10 embeds will be returned 
 */
const fitIntoEmbeds = ( threads: string[], channels: string[] ): EmbedBuilder[] => {
    let embeds: EmbedBuilder[] = []



    return embeds
}

const threads: Command = {
    run: async (interaction: ChatInputCommandInteraction, buildBaseEmbed) => {

        const pub = interaction.options.getBoolean("public")
        const show = interaction.options.getString("show")||"thread"

        await interaction.deferReply({ ephemeral: !(pub||false) })

        interface resObj {
            channels: string[],
            threads: string[],
            threadsFailed: string[],
            channelsFailed: string[]
        }

        const res: resObj = {
            channels: [ ],
            threads: [ ],
            threadsFailed: [ ],
            channelsFailed: [ ]
        }

        const getThreads = async () => {
            for(const [ id, _o ] of threadsList) {
                let thread = await interaction.client.channels.fetch(id).catch(() => { })

                if(thread) {
                    if(!interaction.memberPermissions?.has(PermissionFlagsBits.ViewChannel)) continue;
                    res.threads.push(`<#${id}>`)
                } else {
                    res.threadsFailed.push(`<#${id}> *(Unknown Thread)*`)
                }
            }
        }

        const getChannels = () => {
            let t = []
            t.push("a")
            return t
        }

        if(show === "thread") await getThreads()
        if(show === "channel") await getChannels()
        if(show === "all") {
            await Promise.all([getThreads(), getChannels()])
        }

        let fields: { name: string, value: string }[] = []

        /*
            TODO: can be possible to hit embed char limit if you have many threads. We are allowed 10 embeds per message so we can solve this
            with multiple embeds if one is not enough. Gonna have to ditch using the buildBaseEmbed function for this though.
            anyhow, that is a problem for future me.

            good music for repo explorers: https://open.spotify.com/track/3qa1d6lHDvWnwW0cLKq6xt?si=6c71de38a60f4476
        */
        res.threads.push(...(new Array(500)).fill("<#973252956667383949>", 0, 500))

        // lol cope (i'll fix this later)
        if(fields.length > 25) fields.length = 25
        const { totalLength, fieldArr } = fitIntoFields("Threads", [ ...res.threads, ...res.threadsFailed ])
        if(res.threads.length >= 1 || res.threadsFailed.length >= 1) fields.push( ...fieldArr )
        if(res.channels.length >= 1 || res.channelsFailed.length >= 1) fields.push( ...fitIntoFields("Channels", [ ...res.channels, ...res.channelsFailed ], totalLength).fieldArr )

        buildBaseEmbed(`Watched ${ { all: "threads & channels", thread: "threads", channel: "channels" }[show] }`, statusType.info, {
            fields
        })
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

export default threads