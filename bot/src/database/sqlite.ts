import { err, ok, Result, ResultAsync } from 'neverthrow';
import sql, { Database as SqliteDb } from 'bun:sqlite';
import { ConfigType } from 'utilities/config';
import { with_error_handling } from 'database';
import { join, resolve as resolve_path } from 'path';
import { create as create_tar } from 'tar';
import { map_err } from 'utilities/error';
import { z } from 'zod';
import { safe_parse } from 'utilities/parsing';
import { Database, DatabaseError, RawSetting } from 'interfaces/Database';
import {
  AuditData,
  ChannelData,
  EditMonitor,
  FilterData,
  Guild,
  ZAuditData,
  ZChannelDataWithFilters,
  ZGuild,
  ZThreadData,
} from '@watcher/shared';

const TABLE_CREATION_QUERIES = [
  'CREATE TABLE IF NOT EXISTS threads (id TEXT PRIMARY KEY, server TEXT NOT NULL, parent_channel_id TEXT, due_archive DATE, is_watched INTEGER, managed_by INTEGER)',
  'CREATE TABLE IF NOT EXISTS channels (id TEXT PRIMARY KEY, server TEXT NOT NULL, regex TEXT, role_whitelist TEXT, tags TEXT, is_suspended INTEGER DEFAULT 0)',
  'CREATE TABLE IF NOT EXISTS settings (setting_id TEXT, guild_id TEXT, setting_value TEXT, UNIQUE(setting_id, guild_id) ON CONFLICT REPLACE)',
  'CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY AUTOINCREMENT, error TEXT, command_name TEXT, exec_time_ms INTEGER, audit_type TEXT NOT NULL, guild_id TEXT NOT NULL, executor_id TEXT NOT NULL, target_id TEXT, old_value TEXT, new_value TEXT, reason TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)',
  'CREATE TABLE IF NOT EXISTS guilds (guild_id TEXT PRIMARY KEY, left_at TIMESTAMP, granted_SKU TEXT)',
];

export default class Sqlite implements Database {
  db: SqliteDb;
  private _config: ConfigType;

  constructor(config: ConfigType) {
    this.db = new sql(config.database.database_path);
    this._config = config;
  }

  private query_one<T extends z.ZodTypeAny>(
    schema: T,
    sql: string,
    ...params: any[]
  ): Result<z.output<T> | null, Error> {
    return Result.fromThrowable(() => this.db.prepare(sql).get(...params), map_err)().andThen(
      (val) => {
        if (!val) return ok(null);
        return safe_parse(schema, val);
      },
    );
  }

  private query_all<T extends z.ZodTypeAny>(
    schema: T,
    sql: string,
    ...params: any[]
  ): Result<z.output<T>[], Error> {
    return Result.fromThrowable(() => this.db.prepare(sql).all(...params), map_err)().andThen(
      (val) => {
        return safe_parse(z.array(schema), val);
      },
    );
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
    managed_by?: string | null;
  }) {
    this.db
      .prepare('INSERT INTO threads VALUES (?, ?, ?, ? ,1, ?)')
      .run(
        thread.id,
        thread.server,
        thread.parent_channel_id ?? null,
        thread.due_archive.getTime(),
        thread.managed_by ?? null,
      );
    return ok();
  }

  @with_error_handling
  async delete_thread(thread_id: string) {
    const val = this.db.prepare('DELETE FROM threads WHERE id = ?').run(thread_id);
    return ok(val.changes);
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

  async get_thread(thread_id: string) {
    return this.query_one(ZThreadData, 'SELECT * FROM threads WHERE id = ?', thread_id);
  }

  async get_threads_in_guild(guild_id: string, watched: boolean) {
    return this.query_all(
      ZThreadData,
      'SELECT * FROM threads WHERE server = ? AND is_watched = ?',
      guild_id,
      watched,
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

    return this.query_all(
      ZThreadData,
      'SELECT * FROM threads WHERE due_archive <= ? AND is_watched = 1',
      stale_thresh,
    );
  }

  async get_stale_threads_for_guilds(guild_ids: string[], buffer_in_ms = Sqlite.STALE_BUFFER_MS) {
    const now = Date.now();
    const stale_thresh = now + buffer_in_ms;
    const query = `
      SELECT * FROM threads
      WHERE server IN (${guild_ids.map(() => '?').join(',')})
      AND due_archive <= ?
      AND is_watched = 1
    `;
    return this.query_all(ZThreadData, query, ...guild_ids, stale_thresh);
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
      .prepare('INSERT OR REPLACE INTO channels VALUES(?, ?, ?, ?, ?, ?)')
      .run(
        channel.id,
        channel.server,
        filters?.regex?.source ?? null,
        filters?.role_whitelist?.join(',') ?? null,
        filters?.tags?.join(',') ?? null,
        channel.is_suspended,
      );
    return ok();
  }

  async get_channel(channel_id: string) {
    return this.query_one(
      ZChannelDataWithFilters,
      'SELECT * FROM channels WHERE id = ? AND is_suspended = 0',
      channel_id,
    );
  }

  async get_channels_in_guild(guild_id: string) {
    return this.query_all(
      ZChannelDataWithFilters,
      'SELECT * FROM channels WHERE server = ?',
      guild_id,
    );
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

  async get_audit_logs(guild_id: string, limit: number, before_id?: number) {
    const query = before_id
      ? 'SELECT * FROM audit WHERE guild_id = ? AND id < ? ORDER BY id DESC LIMIT ?'
      : 'SELECT * FROM audit WHERE guild_id = ? ORDER BY id DESC LIMIT ?';
    const params = before_id ? [guild_id, before_id, limit] : [guild_id, limit];

    return this.query_all(ZAuditData, query, ...params).map((logs) => ({
      logs,
      next_cursor: logs.length ? logs[logs.length - 1].id : null,
    }));
  }

  @with_error_handling
  async get_audit_log(id: number) {
    return this.query_one(ZAuditData, 'SELECT * FROM audit WHERE id = ?', id).andThen((row) => {
      if (!row) return err(new Error('not found'));
      return ok(row);
    });
  }

  @with_error_handling
  async clean_expired_logs() {
    const sql = `
    DELETE FROM audit
    WHERE unixepoch(timestamp) < unixepoch('now') - COALESCE(
      (SELECT setting_value FROM settings
        WHERE settings.guild_id = audit.guild_id
        AND setting_id = 'AUDIT_LOG_RETENTION'),
        86400
      )
    `;
    this.db.run(sql);
    return ok();
  }

  async get_guild_info(guild_id: string) {
    return this.query_one(ZGuild, 'SELECT * FROM guilds WHERE guild_id = ?', guild_id);
  }

  @with_error_handling
  async upsert_guild_info(guild_id: string, data: Omit<Guild, 'guild_id'>) {
    const sql = `
    INSERT INTO guilds (guild_id, left_at, granted_SKU)
    VALUES (?, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET
      left_at = excluded.left_at,
      granted_SKU = COALESCE(excluded.granted_SKU, guilds.granted_SKU)
  `;

    this.db
      .prepare(sql)
      .run(guild_id, data.left_at ? data.left_at.toISOString() : null, data.granted_SKU ?? null);
    return ok();
  }

  @with_error_handling
  async edit_monitor(channel_id: string, data: EditMonitor) {
    const fields = [];
    const params: Record<string, any> = {};
    params['$channel_id'] = channel_id;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        let final_value: string | null | number;
        if (value instanceof RegExp) final_value = value?.source;
        else if (Array.isArray(value)) final_value = value.join(',');
        else if (typeof value === 'boolean') final_value = value ? 1 : 0;
        else final_value = value;

        fields.push(`${key} = $${key}`);
        params['$' + key] = final_value;
      }
    }

    const sql = `
      UPDATE 
        channels
      SET
        ${fields.join(',')}
      WHERE
        id = $channel_id
    `;

    this.db.prepare(sql).run(params);
    return ok();
  }

  @with_error_handling
  async remove_data_from_inactive_guilds(
    inactive_time_in_seconds = this._config.database.keep_dead_servers_in_db_seconds,
  ) {
    const inactive_guilds_query = `
      SELECT guild_id FROM guilds 
      WHERE left_at IS NOT NULL 
      AND unixepoch(left_at) < unixepoch('now') - ${inactive_time_in_seconds}
    `;

    this.db.prepare(`DELETE FROM threads WHERE server IN (${inactive_guilds_query})`).run();
    this.db.prepare(`DELETE FROM channels WHERE server IN (${inactive_guilds_query})`).run();
    this.db.prepare(`DELETE FROM settings WHERE guild_id IN (${inactive_guilds_query})`).run();
    this.db.prepare(`DELETE FROM audit WHERE guild_id IN (${inactive_guilds_query})`).run();
    this.db.prepare(`DELETE FROM guilds WHERE guild_id IN (${inactive_guilds_query})`).run();

    return ok();
  }

  /*
  count_watched_threads: () => DBResult<number>;
  count_monitored_channels: () => DBResult<number>;
  */

  @with_error_handling
  async count_watched_threads() {
    const res = this.db
      .prepare('SELECT COUNT(*) AS count FROM threads WHERE is_watched = 1')
      .get() as { count: number };
    return ok(res.count);
  }

  @with_error_handling
  async count_monitored_channels() {
    const res = this.db
      .prepare('SELECT COUNT(*) AS count FROM channels WHERE is_suspended = 0')
      .get() as { count: number };
    return ok(res.count);
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
