export type ReturnData = {
    id: string,
    server: string,
}

export type ThreadData = ReturnData & {
    dueArchive: number
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
    getChannels: (guildID: string) => Promise<ChannelData[]>,
    getThreads: (guildID: string) => Promise<ThreadData[]>,
    deleteThread: (threadID: string) => Promise<void>,
    deleteChannel: (channelID: string) => Promise<void>,
    deleteGuild: (guildID: string) => Promise<void>,
    getNumberOfThreads: () => Promise<number>,
    getNumberOfChannels: () => Promise<number>
}