import { BaseInteraction, ColorResolvable, CommandInteraction, EmbedBuilder, ButtonBuilder, ChatInputCommandInteraction, Interaction, AutocompleteInteraction, ThreadChannel } from "discord.js";
import config from "../config";
import { client, db, logger } from "../bot";
import { commands } from "../bot";
import { statusType, baseEmbedOptions } from "../interfaces/command";
import { addThread, dueArchiveTimestamp } from "../utilities/threadActions";

export default async function(thread: ThreadChannel) {
    const auto = (await db.getChannels(thread.guildId)).find(t => t.id == thread.parentId)
    if(!auto) return

    auto.roles = auto.roles.filter(s => !(s?.trim() == ''))
    auto.tags = auto.tags.filter(s => !(s?.trim() == ''))

    let passes = true

    if(auto.roles && auto.roles.length !== 0) {
        let rolePasses = false
        for(const role of auto.roles) {
            const owner = await thread.fetchOwner()
            if(!role) break;
            if(owner?.guildMember?.roles.cache.has(role)) rolePasses = true
        }
        if(!rolePasses) passes = false
    }

    if(auto.tags && auto.tags.length !== 0) {
        let tagPasses = false
        for(const tag of auto.tags) {
            if(!tag) break;
            if(thread.appliedTags.includes(tag)) tagPasses = true
        }
        if(!tagPasses) passes = false
    }

    if(passes) {
        logger.info(`Automatically adding thread "${thread.id}" in ${thread.guildId}`)
        addThread(thread.id, dueArchiveTimestamp(thread.autoArchiveDuration||0), thread.guildId)
    } else {
        logger.info(`Not adding thread "${thread.id}" in ${thread.guildId} as filters prevent it`)
    }
}