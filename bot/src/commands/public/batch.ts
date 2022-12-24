import { ChatInputCommandInteraction, Channel, PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder, Embed, ThreadChannel, ChannelType, ColorResolvable, DMChannel, CategoryChannel, TextChannel, ForumChannel, NewsChannel, GuildMember } from "discord.js";
import { Command, statusType } from "../../interfaces/command";
import { db, threads as threadsList } from "../../bot";
import { regMatch } from "../../events/threadCreate";
import { strToRegex } from "../../utilities/regex";
import { addThread, dueArchiveTimestamp, removeThread } from "../../utilities/threadActions";

type beer = TextChannel | NewsChannel | ForumChannel

const getThreads = function( channel: beer ): Promise<ThreadChannel[]> {
    return new Promise<ThreadChannel[]>( async (resolve, reject) => {
        let threads: ThreadChannel[] = [ ]

        const [ active, archived ] = await Promise.all([ channel.threads.fetchActive(), channel.threads.fetchArchived() ]).catch(e => {
            reject(e)
            return []
        })

        threads.push( ...active.threads.values(), ...archived.threads.values() )

        resolve(threads)
    })  
}

const getDirThreads = ( dir: CategoryChannel ): Promise<ThreadChannel[]> => {
    return new Promise<ThreadChannel[]>( async (resolve, reject) => {
        let threads: ThreadChannel[] = [ ]

        for(const channel of dir.children.cache) {
            if(!( (channel instanceof TextChannel) || (channel instanceof NewsChannel) || (channel instanceof ForumChannel) )) return
            const chanThreads = await getThreads( channel )

            if(chanThreads)
                threads.push( ...chanThreads )
        }
        
        resolve(threads)
    })
}



const batch: Command = {
    run: async (interaction: ChatInputCommandInteraction, buildBaseEmbed) => {

        const parent = interaction.options.getChannel("parent") || interaction.channel
        if(!( (parent instanceof TextChannel) || (parent instanceof NewsChannel) || (parent instanceof ForumChannel) || (parent instanceof CategoryChannel) )) {
            buildBaseEmbed(`Wrong Channel Type`, statusType.error, { description: `<#${parent?.id}> is not a valid channel for this command`, ephermal: true })
            return
        }

        const action = interaction.options.getString("action")
        if(!action) { 
            buildBaseEmbed(`Rare Easter Egg`, statusType.warning, { description: `Congrats! 🎉\nThis error should be impossible to get but you got it anyhow you silly little sausage.` })
            return
        }

        const pattern = interaction.options.getString("pattern")
        const reg = pattern ? (pattern.length != 0 ? strToRegex(pattern) : null) : null

        const threads: ThreadChannel[] = await (parent instanceof CategoryChannel ? getDirThreads(parent) : getThreads(parent))

        if(reg) {
            threads.filter(f => regMatch(f.name, reg.regex, reg.inverted))   
        }

        for(const t of threads) {
            const addAndFuckingUnArchiveThreadLol = ( thread: ThreadChannel ) => {
                    if(thread.archived && thread.unarchivable) thread.setArchived(false)
                    addThread( thread.id, dueArchiveTimestamp(thread.autoArchiveDuration||0), thread.guildId )
            }
            switch(action) {
                case "watch":
                    addAndFuckingUnArchiveThreadLol(t)
                break;
                case "unwatch":
                    removeThread(t.id)
                break;
                case "toggle":
                    if(threadsList.has(t.id)) {
                        removeThread(t.id)
                    } else addAndFuckingUnArchiveThreadLol(t)
                break;
            }
        }

        buildBaseEmbed("aight bossman", statusType.success, {
            description: `I did whatever the fuck you want with these threads: ${threads.map(t => `<#${t.id}>`).join(", ")}`
        })
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