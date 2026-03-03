import { SqliteError } from 'better-sqlite3';
import { Result } from 'neverthrow';
import {
  type ThreadData,
  type BaseMonitor,
  type FilterData,
  Monitor,
  EditMonitor,
  AuditData,
  Guild,
  ThreadSearchData,
  TicketPanel,
  EditTicketPanel,
} from '@watcher/shared';

export type DatabaseError = SqliteError | Error;

interface InsertThreadData extends Omit<ThreadData, 'is_watched' | 'due_archive'> {
  due_archive: Date;
}

export type DBResult<T = void> = Promise<Result<T, DatabaseError>>;

interface CoreUtils {
  create_backup_file: (base_dir?: string) => DBResult<{ full_path: string; file_name: string }>;
  close: () => DBResult<void>;
}

interface CoreThread {
  insert_thread: (thread: InsertThreadData) => DBResult;
  delete_thread: (thread_id: string) => DBResult;
  set_thread_manager: (thread_id: string, mgr?: string) => DBResult;
  set_thread_auto_archive: (thread_id: string, auto_archive_duration: Date) => DBResult;
  set_thread_watched: (thread_id: string, is_watched: boolean) => DBResult;
  get_thread: (thread_id: string) => DBResult<ThreadData | null>;
  get_threads_in_guild: (guild_id: string, watched: boolean) => DBResult<ThreadData[]>;
  get_paginated_threads_in_guild: (
    guild_id: string,
    limit: number,
    filters: ThreadSearchData,
  ) => DBResult<ThreadData[]>;
  get_watched_threads_count: (guild_id: string) => DBResult<number>;
  get_stale_threads: () => DBResult<ThreadData[]>;
  get_stale_threads_for_guilds: (guild_ids: string[]) => DBResult<ThreadData[]>;
  count_watched_threads: () => DBResult<number>;
}

interface CoreChannel {
  insert_monitor: (
    channel: Omit<BaseMonitor, 'manages_threads_count'>,
    filters?: FilterData,
  ) => DBResult;
  delete_monitor: (channel_id: string) => DBResult;
  get_monitor: (channel_id: string) => DBResult<Monitor | null>;
  get_monitors_in_guild: (guild_id: string) => DBResult<Monitor[]>;
  get_monitors_count: (guild_id: string) => DBResult<number>;
  edit_monitor: (channel_id: string, fields: EditMonitor) => DBResult;
  count_monitored_channels: () => DBResult<number>;
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

/* 'CREATE TABLE IF NOT EXISTS guilds (guild_id INTEGER PRIMARY KEY, left_at TIMESTAMP, granted_SKU TEXT)', */

interface Guilds {
  ensure_guild: (guild_id: string) => DBResult;
  get_guild_info: (guild_id: string) => DBResult<Guild | null>;
  remove_data_from_inactive_guilds: (inactive_time_in_seconds?: number) => DBResult;
  upsert_guild_info: (guild_id: string, data: Omit<Guild, 'guild_id'>) => DBResult;
}

interface Tickets {
  insert_ticket_panel: (guild_id: string, panel: Omit<TicketPanel, 'panel_id'>) => DBResult<string>;
  update_ticket_panel: (panel_id: string, data: Omit<EditTicketPanel, 'id'>) => DBResult;
  delete_ticket_panel: (panel_id: string) => DBResult;
  get_ticket_panels: (guild_id: string) => DBResult<TicketPanel[]>;
  get_ticket_panel: (panel_id: string) => DBResult<TicketPanel | null>;
}

export interface Database extends Core, GuildSettings, Audit, Guilds, Tickets {}
