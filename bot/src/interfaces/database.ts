export interface ReturnData {
  id: string;
  server: string;
}

export type ThreadData = ReturnData & {
  dueArchive: number;
  watching: boolean;
};

export type ChannelData = ReturnData & {
  regex: string;
  roles: (string | null | undefined)[];
  tags: (string | null | undefined)[];
};

export interface Database {
  createTables: () => Promise<void>;
  insertChannel: (data: ChannelData) => Promise<void>;
  insertThread: (
    id: string,
    dueArchive: number,
    guildID: string,
  ) => Promise<void>;
  updateDueArchive: (id: string, dueArchive: number) => Promise<void>;
  getChannels: (guildID: string) => Promise<ChannelData[]>;
  getThreads: (guildID: string) => Promise<ThreadData[]>;
  deleteThread: (threadID: string) => Promise<void>;
  deleteChannel: (channelID: string) => Promise<void>;
  deleteGuild: (guildID: string) => Promise<void>;
  unwatchThread: (threadID: string) => Promise<void>;
  getNumberOfThreads: () => Promise<number>;
  getNumberOfChannels: () => Promise<number>;
  setConfigValue: (
    guildID: string,
    key: string,
    value: string,
  ) => Promise<void>;
  deleteConfigValue: (guildID: string, key: string) => Promise<void>;
  getConfigValue: (guildID: string, key: string) => Promise<string>;
  createBackup: (baseDir: string) => Promise<string>;
}

export interface BackupProvider {
  createBackup: (path: string) => Promise<`https://${string}` | null>;
}
