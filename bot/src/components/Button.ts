import { ButtonBuilder, ButtonInteraction, ButtonStyle } from "discord.js"

interface nButton {
    button: ButtonBuilder,
    onClick: (interaction: ButtonInteraction) => void
}

type buttonOptions = {
    label: string,
    style?: ButtonStyle,
    disabled?: boolean
}