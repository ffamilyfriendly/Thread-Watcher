import { SqliteError } from 'better-sqlite3';
import { Result } from 'neverthrow';
import { z } from 'zod';

export type DatabaseError = SqliteError | Error;

interface InsertThreadData extends Omit<ThreadData, 'is_watched' | 'due_archive'> {
  due_archive: Date;
}

export const ZThreadData = z.object({
  id: z.string(),
  server: z.string(),
  parent_channel_id: z.string().nullish(),
  due_archive: z.coerce.date(),
  is_watched: z.coerce.boolean().default(true),
  is_managed: z.coerce.boolean(),
});
export type ThreadData = z.output<typeof ZThreadData>;

export const ZFilterData = z.object({
  tags: z
    .preprocess(
      (val) => (typeof val === 'string' ? val.split(',') : val),
      z.array(z.string()).nullish(),
    )
    .default([]),
  role_whitelist: z
    .preprocess(
      (val) => (typeof val === 'string' ? val.split(',') : val),
      z.array(z.string()).nullish(),
    )
    .default([]),
  regex: z
    .union([z.string(), z.instanceof(RegExp), z.null()])
    .default(null)
    .transform((val) => {
      if (!val) return undefined;
      if (val instanceof RegExp) return val;

      try {
        const reg = new RegExp(val.trim());

        (reg as any).toJSON = function () {
          return this.source;
        };
        return reg;
      } catch {
        return undefined;
      }
    }),
});

export const ZChannelData = z.object({
  id: z.string(),
  server: z.string(),
  is_suspended: z.coerce.boolean(),
});

export const ZChannelDataWithFilters = ZChannelData.merge(ZFilterData);
export type FilterData = z.output<typeof ZFilterData>;
export type ChannelData = z.output<typeof ZChannelData>;
export type ChannelDataWithFilters = z.output<typeof ZChannelDataWithFilters>;

export const ZAuditData = z.object({
  id: z.number(),
  guild_id: z.string(),
  executor_id: z.string(),
  target_id: z.string().nullish(),
  old_value: z.string().nullish(),
  new_value: z.string().nullish(),
  reason: z.string().nullish(),
  error: z.string().nullish(),
  exec_time_ms: z.number().nullish(),
  command_name: z.string().nullish(),
  timestamp: z.coerce.date().transform((d) => d.getTime()),
  audit_type: z.string(),
});
export type AuditData = z.output<typeof ZAuditData>;

export type DBResult<T = void> = Promise<Result<T, DatabaseError>>;

interface CoreUtils {
  create_backup_file: (base_dir?: string) => DBResult<{ full_path: string; file_name: string }>;
  close: () => DBResult<void>;
}

interface CoreThread {
  insert_thread: (thread: InsertThreadData) => DBResult;
  delete_thread: (thread_id: string) => DBResult;
  set_thread_auto_archive: (thread_id: string, auto_archive_duration: Date) => DBResult;
  set_thread_watched: (thread_id: string, is_watched: boolean) => DBResult;
  get_thread: (thread_id: string) => DBResult<ThreadData | null>;
  get_threads_in_guild: (guild_id: string, watched: boolean) => DBResult<ThreadData[]>;
  get_watched_threads_count: (guild_id: string) => DBResult<number>;
  get_stale_threads: () => DBResult<ThreadData[]>;
}

interface CoreChannel {
  insert_channel: (channel: ChannelData, filters?: FilterData) => DBResult;
  delete_channel: (channel_id: string) => DBResult;
  get_channel: (channel_id: string) => DBResult<ChannelDataWithFilters | null>;
  get_channels_in_guild: (guild_id: string) => DBResult<ChannelDataWithFilters[]>;
  get_monitored_channels_count: (guild_id: string) => DBResult<number>;
}

type Core = CoreUtils & CoreThread & CoreChannel;

export type RawSetting = { setting_id: string; guild_id: string; setting_value: string };

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

  get_guild_settings: (guild_id: string) => DBResult<RawSetting[]>;

  set_guild_setting_value: (
    guild_id: string,
    setting_id: string,
    setting_value: string,
  ) => DBResult;

  delete_guild_setting_value: (guild_id: string, setting_id: string) => DBResult;
}

interface Audit {
  insert_audit_log: (log: Omit<AuditData, 'id' | 'timestamp'>) => DBResult;
  get_audit_logs: (
    guild_id: string,
    limit: number,
    before_id?: number,
  ) => DBResult<{ logs: AuditData[]; next_cursor: number | null }>;
  get_audit_log: (id: number) => DBResult<AuditData>;
  clean_expired_logs: () => DBResult;
}

export interface Database extends Core, GuildSettings, Audit {
  create_tables: () => DBResult;
}
