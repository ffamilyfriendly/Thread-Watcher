import { Database, ThreadData } from 'interfaces/Database';
import { err, ok } from 'neverthrow';
import sql, { Database as SqliteDb, SqliteError } from 'better-sqlite3';
import { ConfigType } from 'utilities/config';

const TABLE_CREATION_QUERIES = [
  'CREATE TABLE IF NOT EXISTS threads (id TEXT PRIMARY KEY, server TEXT NOT NULL, due_archive DATE, is_watched INTEGER)',
];

function handle_error(err_data: unknown) {
  if (err_data instanceof SqliteError || err_data instanceof Error) {
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
    this.db = sql(config.database.database_path);
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
    thread_id: string;
    guild_id: string;
    auto_archive_duration: Date;
  }) {
    try {
      this.db
        .prepare('INSERT INTO threads VALUES (?, ?, ? ,?)')
        .run(thread.thread_id, thread.guild_id, thread.auto_archive_duration);
      return ok();
    } catch (err_data) {
      return handle_error(err_data);
    }
  }

  async delete_thread(thread_id: string) {
    try {
      this.db.prepare('DELETE FROM threads WHERE thread_id = ?').run(thread_id);
      return ok();
    } catch (err_data) {
      return handle_error(err_data);
    }
  }

  async set_thread_auto_archive(thread_id: string, auto_archive_duration: Date) {
    try {
      this.db
        .prepare('UPDATE threads SET due_archive = ? WHERE thread_id = ?')
        .run(auto_archive_duration, thread_id);
      return ok();
    } catch (err_data) {
      return handle_error(err_data);
    }
  }

  async set_thread_watched(thread_id: string, is_watched: boolean) {
    try {
      this.db
        .prepare('UPDATE threads SET is_watched = ? WHERE thread_id = ?')
        .run(is_watched, thread_id);
      return ok();
    } catch (err_data) {
      return handle_error(err_data);
    }
  }

  async get_threads_in_guild(guild_id: string) {
    try {
      return ok(
        this.db.prepare('SELECT * FROM threads WHERE server_id = ?').all(guild_id) as ThreadData[],
      );
    } catch (err_data) {
      return handle_error(err_data);
    }
  }
}
