import { ActionRowBuilder, ModalActionRowComponentBuilder, ModalBuilder, TextInputBuilder } from "@discordjs/builders"
import { ModalSubmitInteraction, TextInputStyle } from "discord.js"

type modalSubmit = ( interaction: ModalSubmitInteraction ) => void
export type modalFilter = ( interaction: ModalSubmitInteraction ) => boolean

const ModalInteractionQueue: Map<string, TwModal> = new Map<string, TwModal>()

export { ModalInteractionQueue }

/**
 * I am truly the smartest brogrammer that has ever lived
 * so this mf master class that i was cooking up at 0230 will construct the button and make a random id and take a callback
 * after the callback is taken it will be added to the ButtonInteractionQueue Map and will be keyed by the button id
 * and when a button interaction that matches the id of the button pops into interactionCreate it will call the onclick func.
 */
export default class TwModal {
    public modal: ModalBuilder
    public id: string

    private callback?: modalSubmit
    public filter?: modalFilter

    constructor(label: string) {
        
        // There is a chance that an id collision can happen but its very VERY slight
        // esp as the button only exists temporarily
        this.id = `${Math.floor(Math.random() * 10_000_000)}`
        
        this.modal = new ModalBuilder()
            .setTitle(label)
            .setCustomId(this.id)
    }

    addInput(label: string, id: string, style: TextInputStyle = TextInputStyle.Short) {
        const input = new TextInputBuilder()
            .setCustomId(id)
            .setLabel(label)
            .setStyle(style)
        
        const actionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>()
        actionRow.addComponents(input)

        this.modal.setComponents(actionRow)
    }

    _middleware(interaction: ModalSubmitInteraction) {
        if(this.filter && this.callback && this.filter(interaction)) {
            this.callback(interaction)
        } else {
            interaction.reply({ ephemeral: true, content: "Nuh uh <:statusurgent:960959148848214017>" })
        }
    }

    close() {
        ModalInteractionQueue.delete(this.id)
    }

    onSubmit(callback: modalSubmit) {
        this.callback = callback
        ModalInteractionQueue.set(this.id, this)
    }
}