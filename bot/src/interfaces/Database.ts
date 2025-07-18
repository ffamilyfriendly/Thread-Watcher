import { SqliteError } from 'better-sqlite3';
import { Result } from 'neverthrow';

export type DatabaseError = SqliteError | Error;

export interface ThreadData {
  thread_id: string;
  guild_id: string;
  auto_archive_duration: Date;
  is_watched: boolean;
}
type ThreadDataInsert = Omit<ThreadData, 'is_watched'>;

interface ChannelData {
  channel_id: string;
  guild_id: string;
}

interface Core {
  // Thread related stuff
  insert_thread: (thread: ThreadDataInsert) => Promise<Result<void, DatabaseError>>;
  delete_thread: (thread_id: string) => Promise<Result<void, DatabaseError>>;
  set_thread_auto_archive: (
    thread_id: string,
    auto_archive_duration: Date,
  ) => Promise<Result<void, DatabaseError>>;
  set_thread_watched: (
    thread_id: string,
    is_watched: boolean,
  ) => Promise<Result<void, DatabaseError>>;
  get_threads_in_guild: (guild_id: string) => Promise<Result<ThreadData[], DatabaseError>>;

  // Channel related stuff
  //insert_channel: (channel: ChannelData) => Promise<Result<void, DatabaseError>>;
}

export interface Database extends Core {
  create_tables: () => Promise<Result<void, DatabaseError>>;
}
