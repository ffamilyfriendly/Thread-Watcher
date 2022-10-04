import { commands } from "../../bot";
import loadCommands from "../loadCommands";


export default function reloadCommands(): void {
    commands.clear()
    for(const [ key, value ] of loadCommands())
        commands.set(key, value)
    return
}