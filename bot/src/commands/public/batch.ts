import { ChatInputCommandInteraction, Channel, PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder, Embed, ThreadChannel, ChannelType, ColorResolvable, DMChannel, CategoryChannel, TextChannel, ForumChannel, NewsChannel, GuildMember } from "discord.js";
import { Command, statusType } from "../../interfaces/command";
import { db, threads as threadsList } from "../../bot";
import { regMatch } from "../../events/threadCreate";
import { strToRegex } from "../../utilities/regex";
import { addThread, dueArchiveTimestamp, removeThread, setArchive } from "../../utilities/threadActions";
import { getDirectTag } from "./threads";

type beer = TextChannel | NewsChannel | ForumChannel

const getThreads = function( channel: beer ): Promise<ThreadChannel[]> {
    return new Promise<ThreadChannel[]>( async (resolve, reject) => {
        let threads: ThreadChannel[] = [ ]

        if(!channel.viewable) return reject("can not view channel")
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

        for(const [_inx, channel] of dir.children.cache) {
            if(!channel) continue;
            if(!( (channel instanceof TextChannel) || (channel instanceof NewsChannel) || (channel instanceof ForumChannel) )) continue;

            const chanThreads = await getThreads( channel ).catch(e => { })

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

        await interaction.deferReply()

        let threads: ThreadChannel[] = await (parent instanceof CategoryChannel ? getDirThreads(parent) : getThreads(parent))

        if(reg) {
            threads = threads.filter(f => regMatch(f.name, reg.regex, reg.inverted))   
        }

        type actionsList = {
            archived: ThreadChannel[],
            unarchived: ThreadChannel[],
            addedWithoutUnArchived: ThreadChannel[],
            noAction: ThreadChannel[]
        }

        const actions: actionsList = {
            archived: [ ],
            unarchived: [ ],
            addedWithoutUnArchived: [ ],
            noAction: [ ]
        }

        for(const t of threads) {
            const addAndUnArchiveThread = ( thread: ThreadChannel ) => {
                // do not add thread to watchlist if already watched
                if(threadsList.has(thread.id)) return actions.noAction.push(thread)

                if(thread.archived && thread.unarchivable) {
                    setArchive(thread)
                    actions.unarchived.push(thread)
                } else actions.addedWithoutUnArchived.push(thread)
                addThread( thread.id, dueArchiveTimestamp(thread.autoArchiveDuration||0) as number, thread.guildId )
            }

            const rmThread = ( thread: ThreadChannel ) => {
                // no need to remove a thread that is not watched
                if(!threadsList.has(thread.id)) return actions.noAction.push(thread)
                removeThread(thread.id)
                actions.archived.push(thread)
            }

            switch(action) {
                case "watch":
                    addAndUnArchiveThread(t)
                break;
                case "unwatch":
                    rmThread(t)
                break;
                case "toggle":
                    if(threadsList.has(t.id)) rmThread(t)
                    else addAndUnArchiveThread(t)
                break;
            }
        }

        const buildActionList = () => {
            let rv = ``

            if(actions.addedWithoutUnArchived.length !== 0) rv += `**Threads watched but not unarchived:** \`${actions.addedWithoutUnArchived.length}\`\n`
            if(actions.unarchived.length !== 0) rv += `**Threads watched and unarchived:** \`${actions.unarchived.length}\`\n`
            if(actions.archived.length !== 0) rv += `**Threads removed from watchlist:** \`${actions.archived.length}\`\n`
            if(actions.noAction.length !== 0) rv += `**Threads not affected:** \`${actions.noAction.length}\`\n`

            return rv
        }

        const e = buildBaseEmbed(`Batch ${action} done`, statusType.success, {
            description: `Action ran on \`${threads.length}\` thread${threads.length === 1 ? "" : "s"}\n${buildActionList()}`,
            noSend: true
        })

        interaction.editReply({ embeds: [ e ] })
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
    gatekeeping: {
        userPermissions: [ PermissionFlagsBits.ManageThreads ],
        ownerOnly: false,
        devServerOnly: false
    },
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