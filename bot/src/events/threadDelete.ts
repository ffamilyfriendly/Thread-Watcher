import { ThreadChannel } from "discord.js";
import { threads } from "../bot";
import { removeThread } from "../utilities/threadActions";

export default function(thread: ThreadChannel) {
    if(!threads.has(thread.id)) return
    removeThread(thread.id)
}