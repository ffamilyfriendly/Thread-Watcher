import { SqliteError } from 'better-sqlite3';
import { Result } from 'neverthrow';

export type DatabaseError = SqliteError | Error;

export interface ThreadData {
  id: string;
  server: string;
  parent_channel_id?: string | null;
  due_archive: number;
  is_watched: boolean;
  is_managed: boolean;
}
interface InsertThreadData extends Omit<ThreadData, 'is_watched' | 'due_archive'> {
  due_archive: Date;
}

export interface ChannelData {
  id: string;
  server: string;
}

export interface FilterData {
  regex?: string;
  tags?: string[];
  role_whitelist?: string[];
}

export type ChannelDataWithFilters = ChannelData & FilterData;

type DBResult<T = void> = Promise<Result<T, DatabaseError>>;

interface CoreUtils {
  create_backup_file: (base_dir?: string) => DBResult<{ full_path: string; file_name: string }>;
}

interface CoreThread {
  insert_thread: (thread: InsertThreadData) => DBResult;
  delete_thread: (thread_id: string) => DBResult;
  set_thread_auto_archive: (thread_id: string, auto_archive_duration: Date) => DBResult;
  set_thread_watched: (thread_id: string, is_watched: boolean) => DBResult;
  get_thread: (thread_id: string) => DBResult<ThreadData | null>;
  get_threads_in_guild: (guild_id: string, watched: boolean) => DBResult<ThreadData[]>;
  get_stale_threads: () => DBResult<ThreadData[]>;
}

interface CoreChannel {
  insert_channel: (channel: ChannelData, filters?: FilterData) => DBResult;
  delete_channel: (channel_id: string) => DBResult;
  get_channel: (channel_id: string) => DBResult<ChannelDataWithFilters | null>;
  get_channels_in_guild: (guild_id: string) => DBResult<ChannelDataWithFilters[]>;
}

type Core = CoreUtils & CoreThread & CoreChannel;

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
  get_guild_setting_value: (guild_id: string, setting_id: string) => DBResult<string | null>;

  set_guild_setting_value: (
    guild_id: string,
    setting_id: string,
    setting_value: string,
  ) => DBResult;

  delete_guild_setting_value: (guild_id: string, setting_id: string) => DBResult;
}

export interface AuditData {
  id: number;
  guild_id: string;
  executor_id: string;
  target_id?: string;
  old_value?: string;
  new_value?: string;
  reason?: string;
  error?: string;
  exec_time_ms?: number;
  command_name?: string;
  timestamp: number;
  audit_type: string;
}

interface Audit {
  insert_audit_log: (log: Omit<AuditData, 'id' | 'timestamp'>) => DBResult;
  get_audit_logs: (guild_id: string, limit: number, page?: number) => DBResult<AuditData[]>;
  get_audit_log: (id: number) => DBResult<AuditData>;
}

export interface Database extends Core, GuildSettings, Audit {
  create_tables: () => DBResult;
}
