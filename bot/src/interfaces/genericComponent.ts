export default interface TwGenericComponent<TInteractionType> {
    _middleware: ( interaction: TInteractionType ) => void
}