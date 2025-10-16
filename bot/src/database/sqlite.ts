import { Database, DatabaseError, ThreadData } from 'interfaces/Database';
import { err, ok, Result } from 'neverthrow';
import sql, { Database as SqliteDb, SQLiteError, SQLQueryBindings } from 'bun:sqlite';
import { ConfigType } from 'utilities/config';
const TABLE_CREATION_QUERIES = [
  'CREATE TABLE IF NOT EXISTS threads (id TEXT PRIMARY KEY, server TEXT NOT NULL, parent_channel_id TEXT, due_archive DATE, is_watched INTEGER)',
  'CREATE TABLE IF NOT EXISTS settings (setting_id TEXT, guild_id TEXT, setting_value BLOB, UNIQUE(setting_id, guild_id) ON CONFLICT REPLACE)',
];

function handle_error(err_data: unknown) {
  if (err_data instanceof SQLiteError || err_data instanceof Error) {
    return err(err_data);
  } else {
    // Tenary operators get VERY beutiful with ts type checking
    // You, the reader, is most welcome. I wrote this shit at 21:00 2025-07-17 btw fun fact!!! :D :D :D
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

  constructor(config: ConfigType) {
    this.db = new sql(config.database.database_path);
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
  }) {
    try {
      this.db
        .prepare('INSERT INTO threads VALUES (?, ?, ?, ? ,1)')
        .run(
          thread.id,
          thread.server,
          thread.parent_channel_id ?? null,
          thread.due_archive.getTime(),
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
        .run(auto_archive_duration.toDateString(), thread_id);
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

  async set_guild_setting_value<T>(
    guild_id: string,
    setting_id: string,
    setting_value: T,
  ): Promise<Result<void, DatabaseError>> {
    try {
      const serialized = JSON.stringify(setting_value);
      this.db.prepare('INSERT INTO settings VALUES(?,?,?)').run(guild_id, setting_id, serialized);
      return ok();
    } catch (err_data) {
      return handle_error(err_data);
    }
  }

  async get_guild_setting_value<T>(guild_id: string, setting_id: string) {
    try {
      const row = this.db
        .prepare('SELECT setting_value FROM settings WHERE guild_id = ? AND setting_id = ?')
        .get(guild_id, setting_id);

      if (!row) {
        return ok(null);
      }

      if (!row || typeof row !== 'object' || !('setting_value' in row)) {
        return err(new Error('Setting not found or invalid row structure'));
      }

      const settings_value = row.setting_value;
      const parsed_json = JSON.parse(settings_value as string);

      if (typeof parsed_json === 'object') return ok(parsed_json as T);
      else return ok(settings_value as T);
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
}
