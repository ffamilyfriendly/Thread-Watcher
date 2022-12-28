import { ChatInputCommandInteraction, PermissionFlagsBits, ModalBuilder, SlashCommandBuilder, TextChannel, ForumChannel, NewsChannel, SelectMenuBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ModalActionRowComponentBuilder, AnyComponentBuilder, SelectMenuInteraction, Role, GuildForumTagEmoji, GuildForumTag, Interaction, ButtonStyle, CacheType, ButtonInteraction, ModalSubmitInteraction } from "discord.js";
import { addThread, dueArchiveTimestamp, removeThread } from "../../utilities/threadActions";
import { Command, statusType } from "../../interfaces/command";
import { db, threads } from "../../bot";
import { ButtonBuilder } from "@discordjs/builders";
import { validRegex } from "../../utilities/regex";

const auto: Command = {
    run: async (interaction: ChatInputCommandInteraction, buildBaseEmbed) => {
        const channel = interaction.options.getChannel("channel") || interaction.channel
        const advanced = interaction.options.getBoolean("advanced") || false

        if(!channel) return
        
        //await interaction.deferReply()

        if(!( (channel instanceof TextChannel) ||(channel instanceof NewsChannel) || (channel instanceof ForumChannel) )) {
            buildBaseEmbed("Wrong Channel", statusType.error, { description: `<#${channel.id}> is not any of: \`ForumChannel\`, \`TextChannel\`, or \`NewsChannel\`` })
            return
        }

        interface filterTypes {
            roles: (Role|undefined|null)[],
            tags: (GuildForumTag | undefined)[],
            regex: string
        }

        let filters: filterTypes = {
            roles: [],
            tags: [],
            regex: ""
        }

        const alreadyExists = (await db.getChannels(channel.guildId)).find(t => t.id == channel.id)

        if(alreadyExists) {
            db.deleteChannel(channel.id)
            buildBaseEmbed("Removed auto on that channel", statusType.success, {
                description: `New threads created in <#${channel.id}> will no longer be automatically watched`
            })

            return
        }

        const autoAdd = () => {
            if(!interaction.guildId) return
            db.insertChannel({ id: channel.id, server: interaction.guildId, regex: filters.regex, tags: filters.tags.map(t => t?.id), roles: filters.roles.map(r => r?.id) })
            buildBaseEmbed("Auto success", statusType.success, {
                description: `Any thread created in <#${channel.id}> will be automatically watched${ advanced ? " if it matches your filters" : "" }`
            })
        }

        if(advanced) {

            let components: any[] = [ ]

            const flairSelectRow = new ActionRowBuilder<SelectMenuBuilder>()

            const word = channel.type === 15 ? "posts" : "threads"

            if(channel.type === 15) {

                const options: { label: string, description: string, value: string }[] = channel.availableTags.map( tag => {
                    return { label: tag.name, description: `Watch posts with the tag ${tag.name}`, value: tag.id }
                } )

                const selectFlairs = new SelectMenuBuilder()
                    .setCustomId(`flairselect_${interaction.id}`)
                    .setPlaceholder("Select Tags")
                    .addOptions( ...options )
                    .setMinValues(0)
                    .setMaxValues(options.length)
                    flairSelectRow.addComponents(selectFlairs)
                    components.push(flairSelectRow)
            }

            if(!interaction.guild) return

            const roleSelectRow = new ActionRowBuilder<SelectMenuBuilder>()

            const options: { label: string, description: string, value: string }[] = interaction.guild.roles.cache.map(r => {
                return { label: `${r.name}`, description: `watch post if user has this role`, value: r.id }
            })

            const selectRoles = new SelectMenuBuilder()
                .setCustomId(`roleselect_${interaction.id}`)
                .setPlaceholder("Select Roles")
                .addOptions( ...options )
                .setMinValues(0)
                .setMaxValues(options.length)
                roleSelectRow.addComponents(selectRoles)
            components.push(roleSelectRow)

            const buttonRow = new ActionRowBuilder()

            const submitButton = new ButtonBuilder()
                .setCustomId(`submit_${interaction.id}`)
                .setStyle(ButtonStyle.Primary)
                .setLabel("Save")
            const regexButton = new ButtonBuilder()
                .setCustomId(`regex_${interaction.id}`)
                .setStyle(ButtonStyle.Secondary)
                .setLabel("Set regex")
            const cancelButton = new ButtonBuilder()
                .setCustomId(`cancel_${interaction.id}`)
                .setStyle(ButtonStyle.Danger)
                .setLabel("cancel")

            buttonRow.addComponents( submitButton, regexButton, cancelButton )
            components.push(buttonRow)

            const buildEmbed = (input?: SelectMenuInteraction | ChatInputCommandInteraction | ButtonInteraction | ModalSubmitInteraction) => {

                const i_have_aids = (emoji: GuildForumTagEmoji) => {
                    if(!emoji.id) return emoji.name
                    else return `<:${emoji.name}:${emoji.id}>`
                }

                const e = buildBaseEmbed(`Auto Advanced`, statusType.info, {
                    fields: [
                        { name: `Only watch ${word} posted by users with these roles`, value: filters.roles.length != 0 ? filters.roles.map(r => `<@&${r?.id}>`).join(", ") : "None selected" },
                        { name: `Only watch ${word} with these tags`, value: filters.tags.length != 0 ? filters.tags.map(tag => `${tag?.emoji ? `${i_have_aids(tag.emoji)} ` : ""}${tag?.name}`).join(", ") : "None selected" },
                        { name: "regex", value: `\`${filters.regex||"not set"}\`` }
                    ],
                    components: [ ...components ],
                    noSend: input ? true : false
                })

                return e
            }

            buildEmbed()

            const listener = ( input: Interaction ) => {
                if(!(input.isButton() || input.isSelectMenu() || input.isModalSubmit())) return
                const [ type, id ] = input.customId.split("_")
                if(id !== interaction.id || input.user.id !== interaction.user.id) return

                if(input.isSelectMenu()) {
                    switch(type) {
                        case "flairselect":
                            if((channel instanceof ForumChannel)) {
                                filters.tags = input.values.map(i => channel.availableTags.find(y => y.id === i))
                            }
                        break;
                        case "roleselect":
                            filters.roles = input.values.map(i => interaction.guild?.roles.cache.get(i))
                        break;
                    }

                    input.update({  embeds: [ buildEmbed(input) ] })
                }
                if(input.isButton()) {
                    switch(type) {
                        case "submit":
                            interaction.client.removeListener("interactionCreate", listener)
                            input.update({  embeds: [ buildEmbed(input) ], components: [ ] })
                            autoAdd()
                        break;
                        case "regex":
                            const modal = new ModalBuilder()
                                .setCustomId(`modal_${interaction.id}`)
                                .setTitle("Enter Regex")
                            const regexText = new TextInputBuilder()
                                .setCustomId(`regex_${interaction.id}`)
                                .setLabel("regex")
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                            modal.addComponents( new ActionRowBuilder<TextInputBuilder>().addComponents( regexText ) )

                            input.showModal(modal)
                        break;
                        case "cancel":
                            interaction.client.removeListener("interactionCreate", listener)
                            input.reply({ content: "cancelled", ephemeral: true })
                            interaction.fetchReply()
                                .then(m => m.deletable ? m.delete() : null)
                        break;
                    }
                }

                if(input.isModalSubmit()) {
                    const regex = input.fields.getTextInputValue(`regex_${interaction.id}`)
                    const valid = validRegex(regex)

                    if(!regex) {
                        input.reply({ content: "Cancelled", ephemeral: true })
                    } else if (!valid.valid) input.reply({ content: `**REGEX NOT VALID**: \`${valid.reason}\`` })
                    else {
                        filters.regex = regex
                        input.reply({ content: "Saved regex!", ephemeral: true })
                        buildEmbed()
                    }
                }
            }

            setTimeout(async () => {
                const e = buildEmbed(interaction)
                if((await interaction.fetchReply()).editable) interaction.editReply({ embeds: [e], components: [ ] })
                interaction.client.removeListener("interactionCreate", listener)
            }, 1000 * 60 * 5)
            interaction.client.on("interactionCreate", listener)

        } else autoAdd()
        

    },
    gatekeeping: {
        userPermissions: [ PermissionFlagsBits.ManageThreads ],
        ownerOnly: false,
        devServerOnly: false
    },
    data: new SlashCommandBuilder()
        .setName("auto")
        .setDescription("automatically watch created threads in a channel or forum"),
    externalOptions: [
        {
            channel_types: [ 15, 5, 0 ],
            description: "channel to automatically watch threads in",
            name: "channel",
            type: 7
        },
        {
            description: "advanced filters",
            name: "advanced",
            type: 5,
            required: false
        }
    ]
}

export default auto