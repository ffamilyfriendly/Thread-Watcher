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
  BaseMonitor,
  EditMonitor,
  FilterData,
  Guild,
  ZAuditData,
  ZMonitor,
  ZGuild,
  ZThreadData,
  ThreadSearchData,
} from '@watcher/shared';

const TABLE_CREATION_QUERIES = [
  'CREATE TABLE IF NOT EXISTS threads (thread_id TEXT PRIMARY KEY, guild_id TEXT NOT NULL, parent_channel_id TEXT, due_archive DATE, is_watched INTEGER, managed_by TEXT)',
  'CREATE TABLE IF NOT EXISTS monitors (target_id TEXT PRIMARY KEY, guild_id TEXT NOT NULL, regex TEXT, role_whitelist TEXT, tags TEXT, is_suspended INTEGER DEFAULT 0)',
  'CREATE TABLE IF NOT EXISTS settings (setting_id TEXT, guild_id TEXT, setting_value TEXT, UNIQUE(setting_id, guild_id) ON CONFLICT REPLACE)',
  'CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL, executor_id TEXT NOT NULL, data TEXT NOT NULL, reason TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)',
  'CREATE TABLE IF NOT EXISTS guilds (guild_id TEXT PRIMARY KEY, left_at TIMESTAMP, granted_SKU TEXT, monthly_tokens NUMBER, persistent_tokens NUMBER, monthly_tokens_last_granted TIMESTAMP)',
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
    thread_id: string;
    guild_id: string;
    parent_channel_id?: string | null;
    due_archive: Date;
    managed_by?: string | null;
  }) {
    this.db
      .prepare('INSERT INTO threads VALUES (?, ?, ?, ? ,1, ?)')
      .run(
        thread.thread_id,
        thread.guild_id,
        thread.parent_channel_id ?? null,
        thread.due_archive.getTime(),
        thread.managed_by ?? null,
      );
    return ok();
  }

  @with_error_handling
  async delete_thread(thread_id: string) {
    const val = this.db.prepare('DELETE FROM threads WHERE thread_id = ?').run(thread_id);
    return ok(val.changes);
  }

  @with_error_handling
  async set_thread_auto_archive(thread_id: string, auto_archive_duration: Date) {
    this.db
      .prepare('UPDATE threads SET due_archive = ? WHERE thread_id = ?')
      .run(auto_archive_duration.getTime(), thread_id);
    return ok();
  }

  @with_error_handling
  async set_thread_watched(thread_id: string, is_watched: boolean) {
    this.db
      .prepare('UPDATE threads SET is_watched = ? WHERE thread_id = ?')
      .run(is_watched, thread_id);
    return ok();
  }

  async get_thread(thread_id: string) {
    return this.query_one(ZThreadData, 'SELECT * FROM threads WHERE thread_id = ?', thread_id);
  }

  async get_threads_in_guild(guild_id: string, watched: boolean) {
    return this.query_all(
      ZThreadData,
      'SELECT * FROM threads WHERE guild_id = ? AND is_watched = ?',
      guild_id,
      watched,
    );
  }

  async get_paginated_threads_in_guild(guild_id: string, limit: number, filters: ThreadSearchData) {
    let params = [guild_id];
    let query_parts = ['guild_id = ?', 'is_watched = 1'];

    if (filters.monitor_id) {
      params.push(filters.monitor_id);
      query_parts.push('managed_by = ?');
    }

    if (filters.parent_channel_id) {
      params.push(filters.parent_channel_id);
      query_parts.push('parent_channel_id = ?');
    }

    const offset = limit * filters.page;

    return this.query_all(
      ZThreadData,
      `SELECT * FROM threads WHERE ${query_parts.join(' AND ')} LIMIT ? OFFSET ?`,
      ...params,
      limit,
      offset,
    );
  }

  @with_error_handling
  async get_watched_threads_count(guild_id: string) {
    return ok(
      (
        this.db
          .prepare('SELECT COUNT(*) FROM threads WHERE guild_id = ? AND is_watched = 1')
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
      WHERE guild_id IN (${guild_ids.map(() => '?').join(',')})
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
  async insert_monitor(channel: Omit<BaseMonitor, 'manages_threads_count'>, filters?: FilterData) {
    this.db
      .prepare('INSERT OR REPLACE INTO monitors VALUES(?, ?, ?, ?, ?, ?)')
      .run(
        channel.target_id,
        channel.guild_id,
        filters?.regex?.source ?? null,
        filters?.role_whitelist?.join(',') ?? null,
        filters?.tags?.join(',') ?? null,
        channel.is_suspended,
      );
    return ok();
  }

  async get_monitor(channel_id: string) {
    return this.query_one(
      ZMonitor,
      'SELECT *, (SELECT COUNT(*) FROM threads WHERE managed_by = monitors.target_id) as manages_threads_count FROM monitors WHERE target_id = ? AND is_suspended = 0',
      channel_id,
    );
  }

  async get_monitors_in_guild(guild_id: string) {
    return this.query_all(
      ZMonitor,
      'SELECT *, (SELECT COUNT(*) FROM threads WHERE managed_by = monitors.target_id) as manages_threads_count FROM monitors WHERE guild_id = ?',
      guild_id,
    );
  }

  @with_error_handling
  async delete_monitor(channel_id: string) {
    this.db.prepare('DELETE FROM monitors WHERE target_id = ?').run(channel_id);
    return ok();
  }

  @with_error_handling
  async get_monitors_count(guild_id: string) {
    return ok(
      (
        this.db.prepare('SELECT COUNT(*) FROM monitors WHERE guild_id = ?').get(guild_id) as {
          'COUNT(*)': number;
        }
      )['COUNT(*)'],
    );
  }

  /*
  id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL, executor_id TEXT NOT NULL, data TEXT NOT NULL, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  */
  @with_error_handling
  async insert_audit_log(log: Omit<AuditData, 'id' | 'timestamp'>) {
    this.db
      .prepare('INSERT INTO audit(guild_id, executor_id, data, reason) VALUES(?, ?, ?, ?)')
      .run(log.guild_id, log.executor_id, JSON.stringify(log.data), log.reason ?? null);
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
    const fields = [];
    const params: Record<string, any> = {};
    params['$guild_id'] = guild_id;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = $${key}`);
        params['$' + key] = value;
      }
    }

    const sql = `
      UPDATE 
        guilds
      SET
        ${fields.join(',')}
      WHERE
        guild_id = $guild_id
    `;

    this.db.prepare(sql).run(params);
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
        monitors
      SET
        ${fields.join(',')}
      WHERE
        target_id = $channel_id
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

    this.db.prepare(`DELETE FROM threads WHERE guild_id IN (${inactive_guilds_query})`).run();
    this.db.prepare(`DELETE FROM monitors WHERE guild_id IN (${inactive_guilds_query})`).run();
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
      .prepare('SELECT COUNT(*) AS count FROM monitors WHERE is_suspended = 0')
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
