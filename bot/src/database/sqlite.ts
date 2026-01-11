import {
  AuditData,
  ChannelData,
  ChannelDataWithFilters,
  Database,
  DatabaseError,
  FilterData,
  RawSetting,
  ThreadData,
} from 'interfaces/Database';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import sql, { Database as SqliteDb, SQLiteError } from 'bun:sqlite';
import { ConfigType } from 'utilities/config';
import { with_error_handling } from 'database';
import { join, resolve as resolve_path } from 'path';
import { create as create_tar } from 'tar';
import { map_err } from 'utilities/error';

const TABLE_CREATION_QUERIES = [
  'CREATE TABLE IF NOT EXISTS threads (id TEXT PRIMARY KEY, server TEXT NOT NULL, parent_channel_id TEXT, due_archive DATE, is_watched INTEGER, is_managed INTEGER)',
  'CREATE TABLE IF NOT EXISTS channels (id TEXT PRIMARY KEY, server TEXT NOT NULL, regex TEXT, role_whitelist TEXT, tags TEXT)',
  'CREATE TABLE IF NOT EXISTS settings (setting_id TEXT, guild_id TEXT, setting_value BLOB, UNIQUE(setting_id, guild_id) ON CONFLICT REPLACE)',
  'CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY AUTOINCREMENT, error TEXT, command_name TEXT, exec_time_ms INTEGER, audit_type TEXT NOT NULL, guild_id TEXT NOT NULL, executor_id TEXT NOT NULL, target_id TEXT, old_value TEXT, new_value TEXT, reason TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)',
];

function handle_error(err_data: unknown) {
  if (err_data instanceof SQLiteError || err_data instanceof Error) {
    return err(err_data);
  } else {
    // Tenary operators get VERY beutiful with ts type checking
    // You, the reader, is most welcome. I wrote this shit at 21:00 2025-07-17 btw fun fact!!! :D :D :D
    // > Thank you, past me, for this nice message. I wrote this reply at 01:58 2025-11-22
    // >> Thank you both. Idk for what. Did not touch this code. I wrote this at 01:33 2025-12-10
    // >>> hello both! I have effectivly removed this code in favour for the decorator. I wrote this at 01:46 2026-01-04 ✌️
    const message =
      err_data &&
      typeof err_data === 'object' &&
      'message' in err_data &&
      typeof err_data.message === 'string'
        ? err_data.message
        : 'unknown error idk bro';

    const unknown_error = new Error(message);

    return err(unknown_error);
  }
}

export default class Sqlite implements Database {
  db: SqliteDb;
  private _config: ConfigType;

  constructor(config: ConfigType) {
    this.db = new sql(config.database.database_path);
    this._config = config;
  }

  @with_error_handling
  async create_tables() {
    for (const query of TABLE_CREATION_QUERIES) {
      this.db.prepare(query).run();
    }
    return ok();
  }

  @with_error_handling
  async close() {
    this.db.close();
    return ok();
  }

  @with_error_handling
  async insert_thread(thread: {
    id: string;
    server: string;
    parent_channel_id?: string | null;
    due_archive: Date;
    is_managed: boolean;
  }) {
    this.db
      .prepare('INSERT INTO threads VALUES (?, ?, ?, ? ,1, ?)')
      .run(
        thread.id,
        thread.server,
        thread.parent_channel_id ?? null,
        thread.due_archive.getTime(),
        thread.is_managed,
      );
    return ok();
  }

  @with_error_handling
  async delete_thread(thread_id: string) {
    this.db.prepare('DELETE FROM threads WHERE id = ?').run(thread_id);
    return ok();
  }

  @with_error_handling
  async set_thread_auto_archive(thread_id: string, auto_archive_duration: Date) {
    this.db
      .prepare('UPDATE threads SET due_archive = ? WHERE id = ?')
      .run(auto_archive_duration.getTime(), thread_id);
    return ok();
  }

  @with_error_handling
  async set_thread_watched(thread_id: string, is_watched: boolean) {
    this.db.prepare('UPDATE threads SET is_watched = ? WHERE id = ?').run(is_watched, thread_id);
    return ok();
  }

  @with_error_handling
  async get_thread(thread_id: string) {
    const res = this.db.prepare('SELECT * FROM threads WHERE id = ?').get(thread_id);

    return ok(res as ThreadData);
  }

  @with_error_handling
  async get_threads_in_guild(guild_id: string, watched: boolean) {
    return ok(
      this.db
        .prepare('SELECT * FROM threads WHERE server = ? AND is_watched = ?')
        .all(guild_id, watched) as ThreadData[],
    );
  }

  @with_error_handling
  async get_watched_threads_count(guild_id: string) {
    return ok(
      (
        this.db
          .prepare('SELECT COUNT(*) FROM threads WHERE server = ? AND is_watched = 1')
          .get(guild_id) as { 'COUNT(*)': number }
      )['COUNT(*)'],
    );
  }

  static STALE_BUFFER_MINUTES = 5;
  static STALE_BUFFER_MS = this.STALE_BUFFER_MINUTES * 60 * 1000;
  @with_error_handling
  async get_stale_threads(buffer_in_ms = Sqlite.STALE_BUFFER_MS) {
    const now = Date.now();
    const stale_thresh = now + buffer_in_ms;

    return ok(
      this.db
        .prepare('SELECT * FROM threads WHERE due_archive <= ? AND is_watched = 1')
        .all(stale_thresh) as ThreadData[],
    );
  }

  @with_error_handling
  async set_guild_setting_value(
    guild_id: string,
    setting_id: string,
    setting_value: string,
  ): Promise<Result<void, DatabaseError>> {
    this.db
      .prepare('INSERT INTO settings(guild_id, setting_id, setting_value) VALUES(?,?,?)')
      .run(guild_id, setting_id, setting_value);
    return ok();
  }

  @with_error_handling
  async get_guild_setting_value(guild_id: string, setting_id: string) {
    const row = this.db
      .prepare('SELECT setting_value FROM settings WHERE guild_id = ? AND setting_id = ?')
      .get(guild_id, setting_id);

    if (!row) return ok(null);

    if (!row || typeof row !== 'object' || !('setting_value' in row)) {
      return err(new Error('Setting not found or invalid row structure'));
    }

    const settings_value = row.setting_value;
    if (typeof settings_value !== 'string') return err(new Error(`setting value was not string`));

    return ok(settings_value);
  }

  @with_error_handling
  async get_guild_settings(guild_id: string) {
    const rows = this.db
      .prepare('SELECT * FROM settings WHERE guild_id = ?')
      .all(guild_id) as RawSetting[];

    return ok(rows);
  }

  @with_error_handling
  async delete_guild_setting_value(guild_id: string, setting_id: string) {
    this.db
      .prepare('DELETE FROM settings WHERE guild_id = ? AND setting_id = ?')
      .run(guild_id, setting_id);
    return ok();
  }

  @with_error_handling
  async insert_channel(channel: ChannelData, filters?: FilterData) {
    this.db
      .prepare('INSERT OR REPLACE INTO channels VALUES(?, ?, ?, ?, ?)')
      .run(
        channel.id,
        channel.server,
        filters && filters.regex ? filters.regex : null,
        filters && filters.role_whitelist ? filters.role_whitelist.join(',') : null,
        filters && filters.tags ? filters.tags.join(',') : null,
      );
    return ok();
  }

  @with_error_handling
  async get_channel(channel_id: string) {
    const val = this.db.prepare('SELECT * FROM channels WHERE id = ?').get(channel_id);
    return ok(val ? (val as ChannelDataWithFilters) : null);
  }

  @with_error_handling
  async get_channels_in_guild(guild_id: string) {
    const val = this.db.prepare('SELECT * FROM channels WHERE server = ?').all(guild_id);
    return ok(val as ChannelDataWithFilters[]);
  }

  @with_error_handling
  async delete_channel(channel_id: string) {
    this.db.prepare('DELETE FROM channels WHERE id = ?').run(channel_id);
    return ok();
  }

  @with_error_handling
  async get_monitored_channels_count(guild_id: string) {
    return ok(
      (
        this.db.prepare('SELECT COUNT(*) FROM channels WHERE server = ?').get(guild_id) as {
          'COUNT(*)': number;
        }
      )['COUNT(*)'],
    );
  }

  @with_error_handling
  async insert_audit_log(log: Omit<AuditData, 'id' | 'timestamp'>) {
    this.db
      .prepare(
        'INSERT INTO audit(audit_type, guild_id, executor_id, target_id, old_value, new_value, reason, error, exec_time_ms, command_name) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        log.audit_type,
        log.guild_id,
        log.executor_id,
        log.target_id ?? null,
        log.old_value ?? null,
        log.new_value ?? null,
        log.reason ?? null,
        log.error ?? null,
        log.exec_time_ms ?? null,
        log.command_name ?? null,
      );
    return ok();
  }

  @with_error_handling
  async get_audit_logs(guild_id: string, limit: number, before_id?: number) {
    let logs_query;
    let logs: AuditData[];

    if (before_id) {
      logs_query = this.db.prepare(
        'SELECT * FROM audit WHERE guild_id = ? AND id < ? ORDER BY id DESC LIMIT ?',
      );
      logs = logs_query.all(guild_id, before_id, limit) as AuditData[];
    } else {
      logs_query = this.db.prepare(
        'SELECT * FROM audit WHERE guild_id = ? ORDER BY id DESC LIMIT ?',
      );
      logs = logs_query.all(guild_id, limit) as AuditData[];
    }

    const next_cursor = logs.length ? logs[logs.length - 1].id : null;

    return ok({ logs, next_cursor });
  }

  @with_error_handling
  async get_audit_log(id: number) {
    const value = this.db.prepare('SELECT * FROM audit WHERE id = ?').get(id);
    if (!value) return err(new Error('not found'));
    return ok(value as AuditData);
  }

  @with_error_handling
  async create_backup_file(backup_dir: string = this._config.database.backup_path) {
    const backup_file_name = new Date().toISOString() + '.tgz';
    const backup_file_full_path = join(backup_dir, backup_file_name);

    const tar_promise = create_tar(
      {
        gzip: true,
        file: backup_file_full_path,
      },
      [this.db.filename],
    );

    const tar_result = await ResultAsync.fromPromise(tar_promise, map_err);

    if (tar_result.isErr()) return err(tar_result.error);

    return ok({ full_path: resolve_path(backup_file_full_path), file_name: backup_file_name });
  }
}
