export type ReturnData = {
    id: string,
    server: string
}

export type ChannelData = ReturnData & {
    regex: string,
    roles: (string|null|undefined)[],
    tags: (string|null|undefined)[]
}

export interface Database {
    createTables: () => Promise<void>,
    insertChannel: ( data: ChannelData ) => Promise<void>,
    insertThread: (id: string, dueArchive: Number, guildID: string) => Promise<void>,
    updateDueArchive: (id: string, dueArchive: Number) => Promise<void>,
    getArchivedThreads: (guildID: string) => Promise<ReturnData[]>,
    getChannels: (guildID: string) => Promise<ChannelData[]>,
    getThreads: (guildID: string) => Promise<ReturnData[]>,
    deleteThread: (threadID: string) => Promise<void>,
    deleteChannel: (channelID: string) => Promise<void>
}