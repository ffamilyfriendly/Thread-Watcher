import {
  AuditData,
  ChannelData,
  ChannelDataWithFilters,
  Database,
  DatabaseError,
  FilterData,
  ThreadData,
} from 'interfaces/Database';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import sql, { Database as SqliteDb, SQLiteError, SQLQueryBindings } from 'bun:sqlite';
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

  async create_tables() {
    try {
      for (const query of TABLE_CREATION_QUERIES) {
        this.db.prepare(query).run();
      }
      return ok();
    } catch (err_data) {
      return handle_error(err_data);
    }
  }

  async insert_thread(thread: {
    id: string;
    server: string;
    parent_channel_id?: string | null;
    due_archive: Date;
    is_managed: boolean;
  }) {
    try {
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
    } catch (err_data) {
      return handle_error(err_data);
    }
  }

  async delete_thread(thread_id: string) {
    try {
      this.db.prepare('DELETE FROM threads WHERE id = ?').run(thread_id);
      return ok();
    } catch (err_data) {
      return handle_error(err_data);
    }
  }

  async set_thread_auto_archive(thread_id: string, auto_archive_duration: Date) {
    try {
      this.db
        .prepare('UPDATE threads SET due_archive = ? WHERE id = ?')
        .run(auto_archive_duration.getTime(), thread_id);
      return ok();
    } catch (err_data) {
      return handle_error(err_data);
    }
  }

  async set_thread_watched(thread_id: string, is_watched: boolean) {
    try {
      this.db.prepare('UPDATE threads SET is_watched = ? WHERE id = ?').run(is_watched, thread_id);
      return ok();
    } catch (err_data) {
      return handle_error(err_data);
    }
  }

  async get_thread(thread_id: string) {
    try {
      const res = this.db.prepare('SELECT * FROM threads WHERE id = ?').get(thread_id);

      return ok(res as ThreadData);
    } catch (err_data) {
      return handle_error(err_data);
    }
  }

  async get_threads_in_guild(guild_id: string, watched: boolean) {
    try {
      return ok(
        this.db
          .prepare('SELECT * FROM threads WHERE server = ? AND is_watched = ?')
          .all(guild_id, watched) as ThreadData[],
      );
    } catch (err_data) {
      return handle_error(err_data);
    }
  }

  static STALE_BUFFER_MINUTES = 5;
  static STALE_BUFFER_MS = this.STALE_BUFFER_MINUTES * 60 * 1000;
  async get_stale_threads(buffer_in_ms = Sqlite.STALE_BUFFER_MS) {
    const now = Date.now();
    const stale_thresh = now + buffer_in_ms;

    try {
      return ok(
        this.db
          .prepare('SELECT * FROM threads WHERE due_archive <= ? AND is_watched = 1')
          .all(stale_thresh) as ThreadData[],
      );
    } catch (err_data) {
      return handle_error(err_data);
    }
  }

  async set_guild_setting_value(
    guild_id: string,
    setting_id: string,
    setting_value: string,
  ): Promise<Result<void, DatabaseError>> {
    try {
      this.db
        .prepare('INSERT INTO settings(guild_id, setting_id, setting_value) VALUES(?,?,?)')
        .run(guild_id, setting_id, setting_value);
      return ok();
    } catch (err_data) {
      return handle_error(err_data);
    }
  }

  async get_guild_setting_value(guild_id: string, setting_id: string) {
    try {
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
    } catch (err_data) {
      return handle_error(err_data);
    }
  }

  async delete_guild_setting_value(guild_id: string, setting_id: string) {
    try {
      this.db
        .prepare('DELETE FROM settings WHERE guild_id = ? AND setting_id = ?')
        .run(guild_id, setting_id);
      return ok();
    } catch (err_data) {
      return handle_error(err_data);
    }
  }

  async insert_channel(channel: ChannelData, filters?: FilterData) {
    try {
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
    } catch (err_data) {
      return handle_error(err_data);
    }
  }

  async get_channel(channel_id: string) {
    try {
      const val = this.db.prepare('SELECT * FROM channels WHERE id = ?').get(channel_id);
      return ok(val ? (val as ChannelDataWithFilters) : null);
    } catch (err_data) {
      return handle_error(err_data);
    }
  }

  async get_channels_in_guild(guild_id: string) {
    try {
      const val = this.db.prepare('SELECT * FROM channels WHERE server = ?').all(guild_id);
      return ok(val as ChannelDataWithFilters[]);
    } catch (err_data) {
      return handle_error(err_data);
    }
  }

  async delete_channel(channel_id: string) {
    try {
      this.db.prepare('DELETE FROM channels WHERE id = ?').run(channel_id);
      return ok();
    } catch (err_data) {
      return handle_error(err_data);
    }
  }

  /*
interface AuditData {
  id: number;
  guild_id: string;
  executor_id: string;
  target_id?: string;
  old_value?: string;
  new_value?: string;
  reason?: string;
  error?: string;
  exec_ms?: number;
  cmd_name?: string;
  timestamp: number;
  audit_type: string;
}
*/

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
  async get_audit_logs(guild_id: string, limit: number, page: number = 1) {
    const offset = (page - 1) * limit;
    const value = this.db
      .prepare('SELECT * FROM audit WHERE guild_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?')
      .all(guild_id, limit, offset);
    return ok(value as AuditData[]);
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
