export interface ConfigValue {
    validate: ( value: any ) => Boolean,
    matchKeys: string[],
    default?: any,
    defaultOnInvalid?: boolean
}