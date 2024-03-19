import { BaseInteraction, ColorResolvable, CommandInteraction, EmbedBuilder, ButtonBuilder, ChatInputCommandInteraction, Interaction, AutocompleteInteraction, ButtonInteraction, ModalSubmitInteraction } from "discord.js";
import { client, logger, config } from "../bot";
import { commands } from "../bot";
import { statusType, baseEmbedOptions } from "../interfaces/command";
import { ButtonInteractionQueue } from "../components/Button";
import { ModalInteractionQueue } from "../components/Modal";

const handleCommands = (interaction: ChatInputCommandInteraction) => {

    const command = commands.get(interaction.commandName)

    const buildBaseEmbed = (title: String, status: statusType = statusType.info, misc?: baseEmbedOptions) => {

        const style = config.style[ status ]
        const e = new EmbedBuilder()
        .setColor(style.colour as ColorResolvable)
        .setTitle(`${style.emoji} ${title}`)

        const ephemeral = misc?.ephermal
        misc?.description ? e.setDescription( misc.description ) : null
        misc?.color ? e.setColor( misc.color ) : null
        misc?.fields ? e.addFields( ...misc.fields ) : null
        misc?.showAuthor ? e.setAuthor({ iconURL: interaction.user.displayAvatarURL(), name: `${interaction.user.username}#${interaction.user.discriminator}` }) : null
        ephemeral ? null : e.setTimestamp()

        if(misc?.noSend) return e

        try {
            if(interaction.replied || interaction.deferred) {
                interaction.editReply({ embeds: [ e ], components: [ ...(misc?.components || [ ]) ] })
            } else {
                interaction.reply({ embeds: [ e ], components: [ ...(misc?.components || [ ]) ], ephemeral: ephemeral ? true : false })
            }
        } catch(err) {
            logger.error("buildBaseEmbed failed (dump below)")
            console.error(err)
        }

        return e
    }

    if(!command) {
        return buildBaseEmbed("Unknown Command", statusType.error, { description: `command \`${interaction.commandName}\` was not found.`, ephermal: true })
    }

    if(!interaction.channel) {
        return buildBaseEmbed("Unknown Channel", statusType.error, { description: "Your interaction happened in an unknown channel.\n**If this is a DM:** run it in a server. Thread-Watcher does not enjoy sliding into DMs\n**If this is __not__ a DM:** something went wrong. Try again later or something" })
    }

    // Ensure command issuer is in the owners array if command is marked as owner only
    if(command.gatekeeping?.ownerOnly && !config.owners.includes(interaction.user.id)) {
        return buildBaseEmbed("Owner Only", statusType.error, { description: `command \`${interaction.commandName}\` is only allowed to be ran by the owner${ config.owners.length >= 2 ? "s" : "" }.`, ephermal: true })
    }

    // Ensure command issuer has sufficient permissions in the channel the command was issued in
    if(command.gatekeeping?.userPermissions && !interaction.memberPermissions?.has(command.gatekeeping.userPermissions)) {
        const missing = interaction.memberPermissions?.missing(command.gatekeeping.userPermissions)
        return buildBaseEmbed("Missing Permissions", statusType.error, {
            description: `command \`${interaction.commandName}\` is only allowed to be ran by users who have sufficient permissions.`,
            fields: [ { name: "You are missing", value: `${missing?.map(m => `\`${m}\``).join(", ")}` } ],
            ephermal: true
        })
    }

    if(command.gatekeeping?.botPermissions && !interaction.appPermissions?.has(command.gatekeeping.botPermissions)) {
        const missing = interaction.appPermissions?.missing(command.gatekeeping.botPermissions)
        return buildBaseEmbed("Missing Permissions", statusType.error, {
            description: `command \`${interaction.commandName}\` requires the bot has sufficient permissions in the channel.`,
            fields: [ { name: "I am missing", value: `${missing?.map(m => `\`${m}\``).join(", ")}` } ],
            ephermal: true
        })
    }

    const errDetails = `
Please report this issue ${config.devServerInvite && (config.devServerInvite !== "https://discord.gg/server") ? `on the [support server](< ${config.devServerInvite}>)` : "on [the repo](<https://github.com/ffamilyfriendly/Thread-Watcher/issues/new>)"}. Include the following:
\`\`\`
command: ${command.data.name}
guild: ${interaction.guildId}
replicate: <what you did to get this error>
\`\`\`
    `

    try {
        command.run(interaction, buildBaseEmbed).catch(e => {
            buildBaseEmbed("Command Error", statusType.error, { ephermal: true, description: `command \`${interaction.commandName}\` failed due to mysterious reasons.\n${errDetails}` })
            logger.error(`[${command.data.name}] failed on guild ${interaction.guildId}\n${e.toString()} (dump below)`)
            console.error(e)
        })
    } catch(err) {
        logger.error(`[${command.data.name}] failed hard on guild ${interaction.guildId} (dump below)`)
        console.error(err)
        buildBaseEmbed("Unknown error", statusType.error, { ephermal: true, description: `command \`${interaction.commandName}\` failed due to mysterious reasons.\n${errDetails}` })
    }
}

const handleAutoComplete = ( interaction: AutocompleteInteraction ) => {
    const command = commands.get(interaction.commandName)
    if(command?.autocomplete) command.autocomplete(interaction)
}

const handleButton = ( interaction: ButtonInteraction ) => {
    const button = ButtonInteractionQueue.get(interaction.customId)
    if(button) {
        button._middleware(interaction)
    }
}

const handleModal = ( interaction: ModalSubmitInteraction ) => {
    const modal = ModalInteractionQueue.get(interaction.customId)
    if(modal) {
        modal._middleware(interaction)
    }
}

export default function(interaction: BaseInteraction) {
    if(interaction.isChatInputCommand()) handleCommands(interaction)
    if(interaction.isAutocomplete()) handleAutoComplete(interaction)
    if(interaction.isButton()) handleButton(interaction)
    if(interaction.isModalSubmit()) handleModal(interaction)
}