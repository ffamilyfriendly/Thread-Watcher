import { BaseInteraction, ColorResolvable, CommandInteraction, EmbedBuilder, ButtonBuilder, ChatInputCommandInteraction } from "discord.js";
import config from "../config";
import { logger } from "../bot";
import { commands } from "../bot";

/*
error: {
            colour: "#D00000",
            emoji: "<:statusurgent:960959148848214017>"
        },
        success: {
            colour: "#4C9F70",
            emoji: "<:statusgood:960960196425957447>"
        },
        info: {
            colour: "#197BBD",
            emoji: "<:statusinfo:960960247571300353>"
        },
        warning: {
            colour: "#F18F01",
            emoji: "⚠️"
        }
*/

enum statusType {
    error = "error",
    success = "success",
    info = "info",
    warning = "warning"
}

const buildBaseEmbed = (title: String, status: statusType = statusType.info) => {

    const style = config.style[ status ]
    const e = new EmbedBuilder()
    .setColor(style.colour as ColorResolvable)
    .setTitle(`${style.emoji} ${title}`)

    return e
}

const handleCommands = (interaction: ChatInputCommandInteraction) => {
    const command = commands.get(interaction.commandName)


    if(!command) {
        const eEmbed = buildBaseEmbed(`Unknown Command`, statusType.error)
        eEmbed.setDescription(`command \`${interaction.commandName}\` was not found.`)
        return interaction.reply( { embeds: [ eEmbed ], ephemeral: true } )
    }

    // Ensure command issuer is in the owners array if command is marked as owner only
    if(command.gatekeeping?.ownerOnly && !config.owners.includes(interaction.user.id)) {
        const eEmbed = buildBaseEmbed(`Owner Only`, statusType.error)
        eEmbed.setDescription(`command \`${interaction.commandName}\` is only allowed to be ran by the owner${ config.owners.length >= 2 ? "s" : "" }.`)
        return interaction.reply( { embeds: [ eEmbed ], ephemeral: true } )
    }

    // Ensure command issuer has sufficient permissions in the channel the command was issued in
    if(command.gatekeeping?.userPermissions && !interaction.memberPermissions?.has(command.gatekeeping.userPermissions)) {
        const missing = interaction.memberPermissions?.missing(command.gatekeeping.userPermissions)
        console.log("missing", missing)
        const eEmbed = buildBaseEmbed(`Missing Permissions`, statusType.error)
        eEmbed.setDescription(`command \`${interaction.commandName}\` is only allowed to be ran by users who have sufficient permissions.`)
        eEmbed.addFields(
            { name: "You are missing", value: `${missing?.map(m => `\`${m}\``).join(", ")}` }
        )
        return interaction.reply( { embeds: [ eEmbed ], ephemeral: true } )
    }

    command.run(interaction)
}

export default function(interaction: BaseInteraction) {
    if(interaction.isChatInputCommand()) handleCommands(interaction)
}