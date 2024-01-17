import { ChatInputCommandInteraction, PermissionFlagsBits, ModalBuilder, SlashCommandBuilder, TextChannel, ForumChannel, NewsChannel, SelectMenuBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, SelectMenuInteraction, Role, GuildForumTagEmoji, GuildForumTag, Interaction, ButtonStyle, ButtonInteraction, ModalSubmitInteraction } from "discord.js";
import { Command, statusType } from "../../interfaces/command";
import { db } from "../../bot";
import { ButtonBuilder, StringSelectMenuBuilder } from "@discordjs/builders";
import { validRegex } from "../../utilities/regex";

interface nButton {
    button: ButtonBuilder,
    onClick: (interaction: ButtonInteraction) => void
}

type buttonOptions = {
    label: string,
    style?: ButtonStyle,
    disabled?: boolean
}



const auto: Command = {
    run: async (interaction: ChatInputCommandInteraction, buildBaseEmbed) => {
        
        buildBaseEmbed("Depracated", statusType.warning, { description: "The functionality of this command has been moved to `/batch`" })
        
        /*
        const channel = interaction.options.getChannel("channel") || interaction.channel
        const advanced = interaction.options.getBoolean("advanced") || false

        if(!channel) return

        let rButtons = new Map<string, nButton>()
        function gButton(btn: buttonOptions, callback: (int: ButtonInteraction) => void, ): nButton {
            
            const id = `${(Buffer.from(btn.label + Date.now()).toString("base64") )}`

            const b = new ButtonBuilder()
                .setCustomId(`${id}_${interaction.id}`)
                .setLabel(btn.label)
                .setStyle(btn.style || ButtonStyle.Primary)
                .setDisabled(btn.disabled ?? false)

            const rv = {
                button: b,
                onClick: callback
            }

            rButtons.set(id, rv)

            return rv
        }

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

            const word = channel.type === 15 ? "posts" : "threads"

            if(!interaction.guild) return

            

            type roleOption = { label: string, description: string, value: string }

            const roleOptions: roleOption[] = interaction.guild.roles.cache.map(r => {
                return { label: `${r.name}`, description: `watch post if user has this role`, value: r.id }
            })

            let roleNavIndex = 0
            const roleOptionChunks: roleOption[][] = []
            for(let i = 0; i < roleOptions.length; i++) {
                const index = Math.floor(i / 25)
                if(!roleOptionChunks[index]) roleOptionChunks[index] = [ ]
                roleOptionChunks[index].push(roleOptions[i])
            }

            const getSelectTags = () => {
                const flairSelectRow = new ActionRowBuilder<SelectMenuBuilder>()
                if(channel.type === 15) {

                    const options: { label: string, description: string, value: string }[] = channel.availableTags.map( tag => {
                        return { label: tag.name, description: `Watch posts with the tag ${tag.name}`, value: tag.id }
                    } )
    
                    const selectFlairs = new StringSelectMenuBuilder()
                        .setCustomId(`flairselect_${interaction.id}`)
                        .setPlaceholder("Select Tags")
                        .addOptions( ...options )
                        .setMinValues(0)
                        .setMaxValues(options.length)
                        flairSelectRow.addComponents(selectFlairs)
                    components.push(flairSelectRow)
                }
            }

            const getSelectRoles = (index: number) => {
                if(!interaction.guild) return

                const roleSelectRow = new ActionRowBuilder<SelectMenuBuilder>()


                const selectRoles = new StringSelectMenuBuilder()
                    .setCustomId(`roleselect_${interaction.id}`)
                    .setPlaceholder(`Select roles${ roleNavIndex !== 0 ? ` (Page ${roleNavIndex + 1})` : "" }`)
                    .addOptions( ...roleOptionChunks[index] )
                    .setMinValues(0)
                    .setMaxValues(roleOptionChunks[index].length)
                roleSelectRow.setComponents(selectRoles)

                components.push(roleSelectRow)
            }

            const getRoleNavigationButtons = () => {
                const roleNavRow = new ActionRowBuilder()
                let btnList = [ ]

                if(roleOptionChunks.length > 1) {
                    const backButton = gButton({ label: "back", disabled: roleNavIndex === 0 }, async (int) => {
                        roleNavIndex = Math.max(0, roleNavIndex - 1)
                        getSelectRoles(roleNavIndex)
                        await int.update({ embeds: [buildEmbed()] })
                    })
    
                    const forwardsButton = gButton({ label: "forwards", disabled: roleNavIndex === (roleOptionChunks.length-1) } , async (int) => {
                        roleNavIndex = Math.min(roleOptionChunks.length-1, roleNavIndex + 1)
                        getSelectRoles(roleNavIndex)
                        await int.update({ embeds: [buildEmbed()] })
                    })

                    btnList.push( backButton.button, forwardsButton.button )
                }

                if(filters.roles.length !== 0) {
                    const clearFiltersButton = gButton({ label: "Clear Roles", style: ButtonStyle.Danger, disabled: false }, async (int) => {
                        filters.roles = [ ]
                        await int.update({ embeds: [buildEmbed()] })
                    })
                    btnList.push( clearFiltersButton.button )
                }
                roleNavRow.setComponents(btnList)

                if(roleNavRow.components.length !== 0) components.push(roleNavRow)
            }

            const getAdvancedButtons = () => {
                const buttonRow = new ActionRowBuilder()
            
                const saveButton = gButton({ label: "Save" }, async (int) => {
                    interaction.client.removeListener("interactionCreate", listener)
                    await int.update({  embeds: [ buildEmbed(int) ], components: [ ] })
                    autoAdd()
                })

                const regexButton = gButton({ label: filters.regex ? "Clear Pattern" : "Set Pattern", style: ButtonStyle.Secondary }, async (int) => {
                    if(filters.regex) {
                        filters.regex = ""
                        await int.update({  embeds: [ buildEmbed() ] })
                    } else {
                        const modal = new ModalBuilder()
                            .setCustomId(`modal_${interaction.id}`)
                            .setTitle("Enter Regex")
                        const regexText = new TextInputBuilder()
                            .setCustomId(`regex_${interaction.id}`)
                            .setLabel("pattern")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                        modal.addComponents( new ActionRowBuilder<TextInputBuilder>().addComponents( regexText ) )
                        int.showModal(modal)
                    }
                })

                const cancelButton = gButton({ label: "Cancel", style: ButtonStyle.Danger }, async (int) => {
                    interaction.client.removeListener("interactionCreate", listener)
                    int.reply({ content: "cancelled", ephemeral: true })
                    interaction.fetchReply()
                        .then(m => m.deletable ? m.delete() : null)
                })

                buttonRow.addComponents( saveButton.button, regexButton.button, cancelButton.button )
                components.push(buttonRow)
            }

            const getComponents = () => {
                components = []
                getSelectTags()
                getSelectRoles(roleNavIndex)
                getAdvancedButtons()
                getRoleNavigationButtons()
            }

            const buildEmbed = (input?: SelectMenuInteraction | ChatInputCommandInteraction | ButtonInteraction | ModalSubmitInteraction) => {

                getComponents()
                const i_have_aids = (emoji: GuildForumTagEmoji) => {
                    if(!emoji.id) return emoji.name
                    else return `<:${emoji.name}:${emoji.id}>`
                }

                const e = buildBaseEmbed(`Auto Advanced`, statusType.info, {
                    fields: [
                        { name: `Only watch ${word} posted by users with these roles`, value: filters.roles.length != 0 ? filters.roles.map(r => `<@&${r?.id}>`).join(", ") : "None selected" },
                        { name: `Only watch ${word} with these tags`, value: filters.tags.length != 0 ? filters.tags.map(tag => `${tag?.emoji ? `${i_have_aids(tag.emoji)} ` : ""}${tag?.name}`).join(", ") : "None selected" },
                        { name: "pattern", value: `\`${filters.regex||"not set"}\`` }
                    ],
                    components: [ ...components ],
                    noSend: input ? true : false
                })

                return e
            }

            buildEmbed()

            const listener = async ( input: Interaction ) => {
                if(!(input.isButton() || input.isStringSelectMenu() || input.isModalSubmit())) return
                const [ type, id ] = input.customId.split("_")
                if(id !== interaction.id || input.user.id !== interaction.user.id) return

                if(input.isStringSelectMenu()) {
                    switch(type) {
                        case "flairselect":
                            if((channel instanceof ForumChannel)) {
                                filters.tags = input.values.map(i => channel.availableTags.find(y => y.id === i))
                            }
                        break;
                        case "roleselect":
                            filters.roles.push(...input.values.map(i => interaction.guild?.roles.cache.get(i)).filter(r => !filters.roles.includes(r)) )
                        break;
                    }

                    input.update({  embeds: [ buildEmbed() ] })
                }
                if(input.isButton() && rButtons.has(type)) rButtons.get(type)?.onClick(input)

                if(input.isModalSubmit()) {
                    const regex = input.fields.getTextInputValue(`regex_${interaction.id}`)
                    const valid = validRegex(regex)

                    if(!regex) {
                        input.reply({ content: "Cancelled", ephemeral: true })
                    } else if (!valid.valid) input.reply({ content: `**PATTERN NOT VALID**: \`${valid.reason}\`\n[__pattern guide__](https://docs.threadwatcher.xyz/usage/commands/batch#pattern)` })
                    else {
                        filters.regex = regex
                        input.reply({ content: "Saved pattern!", ephemeral: true })
                        buildEmbed()
                    }
                }
            }

            setTimeout(async () => {
                const e = buildEmbed(interaction)
                const reply = await interaction.fetchReply()
                if(interaction.replied && reply?.editable) interaction.editReply({ embeds: [e], components: [ ] })
                interaction.client.removeListener("interactionCreate", listener)
            }, 1000 * 60 * 5)
            interaction.client.on("interactionCreate", listener)

        } else autoAdd()
        */

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