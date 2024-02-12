import { ChatInputCommandInteraction, Channel, PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder, Embed, ThreadChannel, ChannelType, ColorResolvable, DMChannel, CategoryChannel, TextChannel, ForumChannel, NewsChannel, GuildMember, FetchedThreads, FetchedThreadsMore, MediaChannel, Role, GuildForumTag, ActionRowBuilder, SelectMenuBuilder, ButtonStyle, ButtonInteraction, TextInputStyle } from "discord.js";
import { Command, statusType } from "../../interfaces/command";
import { db, threads as threadsList } from "../../bot";
import { regMatch } from "../../events/threadCreate";
import { strToRegex } from "../../utilities/regex";
import { addThread, dueArchiveTimestamp, removeThread, setArchive } from "../../utilities/threadActions";
import TwButton from "../../components/Button";
import { ModalBuilder, TextInputBuilder } from "@discordjs/builders";

type threadContainers = TextChannel | NewsChannel | ForumChannel | MediaChannel

type actionsList = {
    archived: ThreadChannel[],
    unarchived: ThreadChannel[],
    addedWithoutUnArchived: ThreadChannel[],
    noAction: ThreadChannel[]
}

interface filterTypes {
    roles: (Role|undefined|null)[],
    tags: (GuildForumTag | undefined)[],
    regex: string
}

const getThreads = function( channel: threadContainers ): Promise<ThreadChannel[]> {
    return new Promise<ThreadChannel[]>( async (resolve, reject) => {
        let threads: ThreadChannel[] = [ ]
        let promises: Promise<FetchedThreads|FetchedThreadsMore>[] = []

        if(!channel.viewable) return reject("can not view channel")

        // Fetch all the active threads for the channel
        promises.push(channel.threads.fetchActive())

        // Fetch all the archived threads for the channel. This requires the bot has "ReadMessageHistory"
        if(channel.guild.members.me && channel.permissionsFor(channel.guild.members.me).has(PermissionFlagsBits.ReadMessageHistory))
            promises.push(channel.threads.fetchArchived())

        const resolvedThreads = await Promise.all(promises).catch(e => {
            reject(e)
            return []
        })

        for(const resolved of resolvedThreads)
            // for some reason this needs to be done as ALL threads in the server are returned???
            // I've no clue why as docs specify that channel.threads.fetch<Active|Archived>() only returns threads of that channel
            threads.push( ...resolved.threads.filter(t => t.parentId == channel.id).values() )

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
        const action = interaction.options.getString("action")
        const advanced = interaction.options.getBoolean("advanced")
        const watchNew = interaction.options.getBoolean("watch-new")

        if(!( (parent instanceof TextChannel) || (parent instanceof NewsChannel) || (parent instanceof ForumChannel) || (parent instanceof CategoryChannel) )) {
            buildBaseEmbed("Wrong Channel Type", statusType.error, { description: `<#${parent?.id}> is not a valid channel for this command`, ephermal: true })
            return
        }

        if(!parent.viewable) {
            buildBaseEmbed("Cannot view channel", statusType.error, { description: `Thread-Watcher cannot see <#${parent.id}>. Make sure the bot has the \`View Channel\` permission in the channel.`, ephermal: true })
            return
        }

        if(!action || !interaction.guildId) { 
            buildBaseEmbed("Rare Easter Egg", statusType.warning, { description: "Congrats! 🎉\nThis error should be impossible to get but you got it anyhow you silly little sausage." })
            return
        }

        await interaction.deferReply()

        const threads: ThreadChannel[] = []

        if(parent instanceof CategoryChannel) threads.push(...await getDirThreads(parent))
            else threads.push(...await getThreads(parent))

        let filters: filterTypes = {
            roles: [],
            tags: [],
            regex: ""
        }

        const embeds = []

        // This is against the law but I do not care for i am the code bandit herherherhehrherherherhreuh
        const components: any[] = []

        if(advanced) {
            const filterEmbed = buildBaseEmbed(
                "Filter Options", 
                statusType.info, 
                    { 
                        noSend: true,
                        description: `
                            The bot will only handle threads that match the criteria set by you below.

                            <:arrow_right:1197893896416538695> If multiple roles are selected, the thread owner **needs only one** for the thread to be watched
                            <:arrow_right:1197893896416538695> The same is true for post tags
                        `
                    }
                )

            const regexRowComponents = new ActionRowBuilder()
            //const rolesSelectComponents = new ActionRowBuilder<SelectMenuBuilder>()
            //const rolesRowNavigationComponents = new ActionRowBuilder()
            //const tagsSelectComponents = new ActionRowBuilder<SelectMenuBuilder>()
            embeds.push(filterEmbed)
            components.push(regexRowComponents, /*rolesSelectComponents, rolesRowNavigationComponents, tagsSelectComponents*/) 

            const genEmbedFields = () => {
                filterEmbed.setFields([
                    { name: "Roles", value: "<roleshere>", inline: true },
                    { name: "Tags", value: "<tagshere>", inline: true },
                    { name: "Pattern", value: `\`${filters.regex}\``, inline: true }
                ])
            }

            const updateEmbed = (i: ButtonInteraction) => {
                genEmbedFields()
                i.update({embeds: [ filterEmbed ]})
            }

            const regexButtons = () => {
                const setButton = new TwButton("Select Pattern", ButtonStyle.Primary)
                const tryButton = new TwButton("Try Pattern", ButtonStyle.Secondary)
                const clearButton = new TwButton("Clear Pattern", ButtonStyle.Danger)

                const filter = (int: ButtonInteraction) => int.user.id === interaction.user.id
    
                setButton.filter    = filter
                tryButton.filter    = filter
                clearButton.filter  = filter
                
                setButton.onclick((i) => {
                    const modal = new ModalBuilder()
                        .setCustomId(`modal_${interaction.id}`)
                        .setTitle("Enter Pattern")
                    
                    const patternText = new TextInputBuilder()
                        .setCustomId(`pattern_${interaction.id}`)
                        .setLabel("Pattern")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)

                    const container = new ActionRowBuilder().addComponents(patternText)
                    // this is bitching about types even though I have everything handled
                    // and I will still have to handle modal interactions and I dont have the time rn
                    // TODO: fix this (later)
                    modal.addComponents(container)


                    updateEmbed(i)
                })

                clearButton.onclick((i) => {
                    filters.regex = ""
                    updateEmbed(i)
                })
    
                regexRowComponents.addComponents(setButton.button, clearButton.button, tryButton.button)
            }



            regexButtons()
            genEmbedFields()

            const selectedRoles: string[] = [ ]

            interaction.editReply({embeds: [ filterEmbed ], components: [ ...components ]})

            // For debugging
            return
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
                if(threadsList.has(thread.id) && threadsList.get(thread.id)?.watching) return actions.noAction.push(thread)

                if(thread.archived && thread.unarchivable) {
                    setArchive(thread)
                    actions.unarchived.push(thread)
                } else actions.addedWithoutUnArchived.push(thread)
                addThread( thread.id, dueArchiveTimestamp(thread.autoArchiveDuration||0, thread.lastMessage?.createdAt) as number, thread.guildId )
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
                default:
                    actions.noAction.push(t)
                break;
            }
        }


        if(watchNew) {
            const alreadyExists = (await db.getChannels(parent.id)).find(t => t.id == parent.id)

            // If filter alr exists for this channel we go ahead and delete it
            // this so the insertion we make later does not cause any oopsie poopsies
            if(alreadyExists) await db.deleteChannel(parent.id)
    
            db.insertChannel({ id: parent.id, server: interaction.guildId, regex: filters.regex, tags: filters.tags.map(t => t?.id), roles: filters.roles.map(r => r?.id) })
        }

        const buildActionList = () => {
            let rv = ""

            if(actions.addedWithoutUnArchived.length !== 0) rv += `**Threads watched but not unarchived:** \`${actions.addedWithoutUnArchived.length}\`\n`
            if(actions.unarchived.length !== 0) rv += `**Threads watched and unarchived:** \`${actions.unarchived.length}\`\n`
            if(actions.archived.length !== 0) rv += `**Threads removed from watchlist:** \`${actions.archived.length}\`\n`
            if(actions.noAction.length !== 0) rv += `**Threads not affected:** \`${actions.noAction.length}\`\n`

            return rv
        }

        const resultEmbed = buildBaseEmbed("Done", statusType.success, {
            noSend: true,
            description: `new threads ${ watchNew ? "will" : "will not" } be watched`,
            fields: [
                { 
                    name: "Threads actioned", value: buildActionList() 
                }
            ]
        })

        embeds.push(resultEmbed)


        interaction.editReply({ embeds })
    },
    data: new SlashCommandBuilder()
        .setName("batch")
        .setDescription("watch or unwatch multiple threads at once")
        .addStringOption((o) => 
            o
            .setName("action")
            .setDescription("what action to run on selected threads")
            .setChoices(...[ { name: "watch", value:"watch" }, { name: "unwatch", value:"unwatch" }, { name: "toggle", value:"toggle" }, { name: "nothing", value: "nothing" } ])
            .setRequired(true)
        )
        .addBooleanOption((o) =>
            o
            .setName("advanced")
            .setDescription("if you want more options")
        )
        .addBooleanOption((o) =>
            o
            .setName("watch-new")
            .setDescription("will automatically watch new threads")
        ),
    gatekeeping: {
        userPermissions: [ PermissionFlagsBits.ManageThreads ],
        ownerOnly: false,
        devServerOnly: true
    },
    externalOptions: [
        {
            channel_types: [ 0, 4, 5, 15, 16 ],
            description: "parent whose children will be affected",
            name: "parent",
            type: 7
        }
    ]
}

export default batch