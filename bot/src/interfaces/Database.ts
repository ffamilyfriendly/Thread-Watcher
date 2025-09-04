import { SqliteError } from 'better-sqlite3';
import { Result } from 'neverthrow';

export type DatabaseError = SqliteError | Error;

export interface ThreadData {
  id: string;
  server: string;
  due_archive: number;
  is_watched: boolean;
}
interface InsertThreadData extends Omit<ThreadData, 'is_watched' | 'due_archive'> {
  due_archive: Date;
}

interface Core {
  // Thread related stuff
  insert_thread: (thread: InsertThreadData) => Promise<Result<void, DatabaseError>>;
  delete_thread: (thread_id: string) => Promise<Result<void, DatabaseError>>;
  set_thread_auto_archive: (
    thread_id: string,
    auto_archive_duration: Date,
  ) => Promise<Result<void, DatabaseError>>;
  set_thread_watched: (
    thread_id: string,
    is_watched: boolean,
  ) => Promise<Result<void, DatabaseError>>;
  get_thread: (thread_id: string) => Promise<Result<ThreadData | null, DatabaseError>>;
  get_threads_in_guild: (guild_id: string) => Promise<Result<ThreadData[], DatabaseError>>;

  // Channel related stuff
  //insert_channel: (channel: ChannelData) => Promise<Result<void, DatabaseError>>;
}

/**
 *
 * I will not be following data normalization rules here.
 * Quite frankly because I cannot be arsed. Sorry.
 *
 * I know, i know. I should create a table for the different settings and use an assoc table and so forth and so forth.
 * I am a bad boy rebel cool guy so i will no do that 😎. Sorry Anton
 * (if a future employer reads this: i am can be rule abiding not cool guy for sufficient pay)
 */
interface GuildSettings {
  get_guild_setting_value: <T>(
    guild_id: string,
    setting_id: string,
  ) => Promise<Result<T | null, DatabaseError>>;

  set_guild_setting_value: <T>(
    guild_id: string,
    setting_id: string,
    setting_value: T,
  ) => Promise<Result<void, DatabaseError>>;

  delete_guild_setting_value: (
    guild_id: string,
    setting_id: string,
  ) => Promise<Result<void, DatabaseError>>;
}

export interface Database extends Core, GuildSettings {
  create_tables: () => Promise<Result<void, DatabaseError>>;
}
