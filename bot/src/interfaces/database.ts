type ReturnData = {
    id: String,
    server: String
}

export interface Database {
    createTables: () => Promise<void>,
    insertChannel: (id: String, guildID: String) => Promise<void>,
    insertThread: (id: String, dueArchive: Number, guildID: String) => Promise<void>,
    updateDueArchive: (id: String, dueArchive: Number) => Promise<void>,
    getArchivedThreads: (guildIDs: String[]) => Promise<ReturnData[]>,
    getChannels: (guildIDs: String[]) => Promise<ReturnData[]>,
    getThreads: (guildIDs: String[]) => Promise<ReturnData[]>,
    getThreadsInGuild: (guildID: String) => Promise<ReturnData>,
    deleteThread: (threadID: String) => Promise<void>,
    deleteChannel: (channelID: String) => Promise<void>
}