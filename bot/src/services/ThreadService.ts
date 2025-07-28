import { PrivateThreadChannel, ThreadChannel } from 'discord.js';
import { Database, ThreadData } from 'interfaces/Database';
import Redis from 'ioredis';
import { ok } from 'neverthrow';

export type GenericThread = ThreadChannel | PrivateThreadChannel;

/**
 * This function exists as thread.lastMessage is often NULL even tho thread.lastMessageId exists.
 * We dont actually need any of the message deets. We just want the time it was sent and we can extract that from the snowflake
 * @param snowflake ID of the message
 * @returns date when message was sent
 * @see https://github.com/vegeta897/snow-stamp/blob/main/src/convert.js
 */
export function convert_snowflake_to_date(snowflake: string) {
  const DISCORD_EPOCH = 1420070400000;
  const snowflake_as_ms = BigInt(snowflake) >> 22n;
  return new Date(Number(snowflake_as_ms) + DISCORD_EPOCH);
}

/**
 *
 * @param auto_archive_duration_minutes The auto archive duration setting of the thread
 * @param last_activity Whenever the last activity (message sent, edit, un-archival) of the thread was
 * @see https://discord.com/developers/docs/topics/threads#active-archived-threads
 */
export function get_stale_timestamp(
  auto_archive_duration_minutes: number,
  last_activity: Date = new Date(0),
): Date {
  const auto_archive_duration_as_ms = auto_archive_duration_minutes * 60 * 1000;
  return new Date(last_activity.getTime() + auto_archive_duration_as_ms);
}

function format_thread_data(row: ThreadData) {
  return {
    id: row.id,
    server: row.server,
    is_watched: Boolean(row.is_watched),
    due_archive: new Date(row.due_archive),
  };
}

export default class ThreadService {
  static readonly CACHE_TTL_SECONDS = 900;

  constructor(
    private db: Database,
    private redis: Redis,
  ) {}

  async insert_thread(thread: GenericThread) {
    const last_activity = thread.lastMessageId
      ? convert_snowflake_to_date(thread.lastMessageId)
      : thread.createdAt;

    const expires_at = get_stale_timestamp(
      thread.autoArchiveDuration ?? 0,
      last_activity ?? undefined,
    );

    const thread_data = {
      id: thread.id,
      server: thread.guildId,
      due_archive: expires_at,
    };

    const res = await this.db.insert_thread(thread_data);

    if (res.isOk()) {
      this.redis.set(
        `thread:${thread.id}`,
        JSON.stringify(thread_data),
        'EX',
        ThreadService.CACHE_TTL_SECONDS,
      );
    }

    return res;
  }

  async get_thread(thread_id: string) {
    const cached = await this.redis.get(`thread:${thread_id}`);
    if (cached) return ok(format_thread_data(JSON.parse(cached)));

    const data = await this.db.get_thread(thread_id);

    if (data.isOk()) {
      if (data.value !== null) {
        this.redis.set(
          `thread:${thread_id}`,
          JSON.stringify(data.value),
          'EX',
          ThreadService.CACHE_TTL_SECONDS,
        );
      }
      return ok(data.value ? format_thread_data(data.value) : null);
    } else return data;
  }

  async set_thread_watch_status(thread_id: string, is_watched: boolean) {
    const result = await this.db.set_thread_watched(thread_id, is_watched);

    if (result.isOk()) {
      const cached_value = await this.redis.get(`thread:${thread_id}`);

      if (cached_value) {
        const as_obj = format_thread_data(JSON.parse(cached_value));
        as_obj.is_watched = is_watched;
        this.redis.set(
          `thread:${thread_id}`,
          JSON.stringify(as_obj),
          'EX',
          ThreadService.CACHE_TTL_SECONDS,
        );
      }
    }

    return result;
  }

  async watch_thread(thread: GenericThread) {
    const db_entry = await this.get_thread(thread.id);

    if (db_entry.isOk() && db_entry.value === null) return this.insert_thread(thread);
    else return this.set_thread_watch_status(thread.id, true);
  }

  async unwatch_thread(thread: GenericThread) {
    return this.set_thread_watch_status(thread.id, false);
  }

  async toggle_thread_watch_status(thread: GenericThread) {
    const db_thread_entry = await this.get_thread(thread.id);

    if (db_thread_entry.isErr()) return db_thread_entry;

    if (db_thread_entry.value && db_thread_entry.value.is_watched) {
      return (await this.unwatch_thread(thread)).map((o) => false);
    } else {
      return (await this.watch_thread(thread)).map((o) => true);
    }
  }

  async delete_thread(thread_id: string) {
    this.redis.del(`thread:${thread_id}`);
    return this.db.delete_thread(thread_id);
  }
}
