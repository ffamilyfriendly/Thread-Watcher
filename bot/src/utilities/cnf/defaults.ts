import { ConfigValue } from "src/interfaces/config";
import { DataBases } from "../database/DatabaseManager"


const token: ConfigValue = {
    validate: (value) => {
        if(typeof value !== "string") return false
        return (value.length > 10)
    },
    matchKeys: [ "discord" ],
}

const colour: ConfigValue = {
    validate: (value) => {
        if(typeof value !== "string") return false
        return /^#(([0-9a-fA-F]{2}){3}|([0-9a-fA-F]){3})$/gm.test(value)
    },
    matchKeys: [ "colour" ],
    defaultOnInvalid: true,
    default: "#197BBD"
}

const webhook: ConfigValue = {
    validate: (value) => {
        if(!value) return true
        if(typeof value !== "string") return false
        return value.toString().startsWith("https://discord.com")
    },
    matchKeys: [ "logWebhook" ],
}

const dbType: ConfigValue = {
    validate: (value) => {
        if(typeof value !== "string") return false
        return !!DataBases[value as "sqlite"|"mysql"]
    },
    default: "sqlite",
    defaultOnInvalid: true,
    matchKeys: [ "type" ]
}

const validators = [ token, colour, webhook, dbType ]

export function validateValue( key: string, value: any ) {
    const validator = validators.find(a => a.matchKeys.includes(key))
    if(!validator) return value
    const passes = validator.validate(value)

    if(passes) return value
    else if(validator.defaultOnInvalid && validator.default) {
        console.warn(`CONFIG warning\nKey "${key}" with value "${value}" does not follow allowed format. Defaulting to "${validator.default}"`)
        return validator.default
    }
    else {
        console.error(`CONFIG error\nKey "${key}" with value "${value}" does not follow allowed format. Aborting!`)
        process.exit(1)
    }
}