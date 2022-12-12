import { BaseInteraction, ColorResolvable, CommandInteraction, EmbedBuilder, ButtonBuilder, ChatInputCommandInteraction, Interaction, AutocompleteInteraction } from "discord.js";
import config from "../config";
import { client, logger } from "../bot";
import { commands } from "../bot";
import { statusType, baseEmbedOptions } from "../interfaces/command";

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

        if(interaction.replied || interaction.deferred) {
            interaction.editReply({ embeds: [ e ], components: [ ...(misc?.components || [ ]) ] })
        } else {
            interaction.reply({ embeds: [ e ], components: [ ...(misc?.components || [ ]) ], ephemeral: ephemeral ? true : false })
        }

        return e
    }

    if(!command) {
        return buildBaseEmbed(`Unknown Command`, statusType.error, { description: `command \`${interaction.commandName}\` was not found.`, ephermal: true })
    }

    if(!interaction.channel) {
        return buildBaseEmbed("Unknown Channel", statusType.error, { description: `Your interaction happened in an unknown channel.\n**If this is a DM:** run it in a server. Thread-Watcher does not enjoy sliding into DMs\n**If this is __not__ a DM:** something went wrong. Try again later or something` })
    }

    // Ensure command issuer is in the owners array if command is marked as owner only
    if(command.gatekeeping?.ownerOnly && !config.owners.includes(interaction.user.id)) {
        return buildBaseEmbed(`Owner Only`, statusType.error, { description: `command \`${interaction.commandName}\` is only allowed to be ran by the owner${ config.owners.length >= 2 ? "s" : "" }.`, ephermal: true })
    }

    // Ensure command issuer has sufficient permissions in the channel the command was issued in
    if(command.gatekeeping?.userPermissions && !interaction.memberPermissions?.has(command.gatekeeping.userPermissions)) {
        const missing = interaction.memberPermissions?.missing(command.gatekeeping.userPermissions)
        return buildBaseEmbed(`Missing Permissions`, statusType.error, {
            description: `command \`${interaction.commandName}\` is only allowed to be ran by users who have sufficient permissions.`,
            fields: [ { name: "You are missing", value: `${missing?.map(m => `\`${m}\``).join(", ")}` } ],
            ephermal: true
        })
    }

    if(command.gatekeeping?.botPermissions && !interaction.appPermissions?.has(command.gatekeeping.botPermissions)) {
        const missing = interaction.appPermissions?.missing(command.gatekeeping.botPermissions)
        return buildBaseEmbed(`Missing Permissions`, statusType.error, {
            description: `command \`${interaction.commandName}\` requires the bot has sufficient permissions in the channel.`,
            fields: [ { name: "I am missing", value: `${missing?.map(m => `\`${m}\``).join(", ")}` } ],
            ephermal: true
        })
    }

    try {
        command.run(interaction, buildBaseEmbed)
    } catch(err) {
        console.error(err)
        buildBaseEmbed("Unknown error", statusType.error, { ephermal: true, description: `command \`${interaction.commandName}\` failed due to mysterious reasons.\nPlease report this issue if it continues` })
    }
}

const handleAutoComplete = ( interaction: AutocompleteInteraction ) => {
    const command = commands.get(interaction.commandName)
    if(command?.autocomplete) command.autocomplete(interaction)
}

export default function(interaction: BaseInteraction) {
    if(interaction.isChatInputCommand()) handleCommands(interaction)
    if(interaction.isAutocomplete()) handleAutoComplete(interaction)
}