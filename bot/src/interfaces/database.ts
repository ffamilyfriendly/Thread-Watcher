export type ReturnData = {
    id: string,
    server: string
}

export interface Database {
    createTables: () => Promise<void>,
    insertChannel: (id: string, guildID: string) => Promise<void>,
    insertThread: (id: string, dueArchive: Number, guildID: string) => Promise<void>,
    updateDueArchive: (id: string, dueArchive: Number) => Promise<void>,
    getArchivedThreads: (guildID: string) => Promise<ReturnData[]>,
    getChannels: (guildID: string) => Promise<ReturnData[]>,
    getThreads: (guildID: string) => Promise<ReturnData[]>,
    deleteThread: (threadID: string) => Promise<void>,
    deleteChannel: (channelID: string) => Promise<void>
}