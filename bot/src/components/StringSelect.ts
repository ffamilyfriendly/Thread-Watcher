import { AnySelectMenuInteraction, StringSelectMenuBuilder } from "discord.js"
import TwGenericComponent from "../interfaces/genericComponent"

type stringSelectSubmit = ( interaction: AnySelectMenuInteraction ) => void
export type stringSelectFilter = ( interaction: AnySelectMenuInteraction ) => boolean

const StringSelectInteractionQueue: Map<string, TwStringSelect> = new Map<string, TwStringSelect>()

export { StringSelectInteractionQueue }


export default class TwStringSelect implements TwGenericComponent<AnySelectMenuInteraction> {
    public select: StringSelectMenuBuilder
    public id: string

    private callback?: stringSelectSubmit
    public filter?: stringSelectFilter

    constructor() {
        
        // There is a chance that an id collision can happen but its very VERY slight
        // esp as the button only exists temporarily
        this.id = `${Math.floor(Math.random() * 10_000_000)}`

        this.select = new StringSelectMenuBuilder()
            .setCustomId(this.id)
    }

    _middleware(interaction: AnySelectMenuInteraction) {
        console.log("middleware function called")
        if(this.filter && this.callback && this.filter(interaction)) {
            this.callback(interaction)
        } else {
            interaction.reply({ ephemeral: true, content: "Nuh uh <:statusurgent:960959148848214017>" })
        }
    }

    close() {
        StringSelectInteractionQueue.delete(this.id)
    }

    onSubmit(callback: stringSelectSubmit) {
        this.callback = callback
        StringSelectInteractionQueue.set(this.id, this)
    }
}