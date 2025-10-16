import { PrivateThreadChannel, ThreadChannel } from 'discord.js';
import { ThreadFetcher } from 'fetchers/ThreadFetcher';
import { Database, ThreadData } from 'interfaces/Database';
import Redis from 'ioredis';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { safe_parse } from 'utilities/parsing';
import { z } from 'zod';

export type GenericThread = ThreadChannel;

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

export const FormattedThreadDataSchema = z.object({
  id: z.string(),
  server: z.string(),
  is_watched: z.coerce.boolean(),
  due_archive: z.coerce.date(),
});

export type FormattedThreadData = z.infer<typeof FormattedThreadDataSchema>;

export const DetailedThreadViewSchema = z.object({
  watch_data: FormattedThreadDataSchema.nullable(),
  applied_tags: z.array(z.string()),
  created_at: z.coerce.date().nullable(),
  thread_id: z.string(),
});

export type DetailedThreadView = z.infer<typeof DetailedThreadViewSchema>;

export default class ThreadService {
  static readonly CACHE_TTL_SECONDS = 900;

  constructor(
    private db: Database,
    private redis: Redis,
    private fetcher: ThreadFetcher,
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
      parent_channel_id: thread.parentId,
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
    if (cached) {
      const parsed = safe_parse(FormattedThreadDataSchema, JSON.parse(cached));
      if (parsed.isErr()) return err(parsed.error);
      else return ok(parsed.value);
    }

    const data = await this.db.get_thread(thread_id);

    if (data.isErr()) return err(data.error);

    if (data.value !== null) {
      this.redis.set(
        `thread:${thread_id}`,
        JSON.stringify(data.value),
        'EX',
        ThreadService.CACHE_TTL_SECONDS,
      );
    }

    const { value } = safe_parse(FormattedThreadDataSchema, data.value).match(
      (parsed_data) => ok(parsed_data),
      (_never) => ok(null),
    );

    return ok(value);
  }

  async get_detailed_thread(guild_id: string, thread_id: string) {
    const redis_id = `thread:${thread_id}:detailed`;
    const redis_hit = await ResultAsync.fromPromise(this.redis.get(redis_id), (err) => err);

    if (redis_hit.isOk() && redis_hit.value) {
      const parsed = safe_parse(DetailedThreadViewSchema, JSON.parse(redis_hit.value));
      if (parsed.isOk()) return ok(parsed);
      else return err(parsed.error);
    }

    const base_thread_data = await this.get_thread(thread_id);
    if (base_thread_data.isErr()) return err(base_thread_data.error);

    const response = await this.fetcher.fetch_thread_details(guild_id, thread_id);
    if (response.isErr()) return err(response.error);

    const { appliedTags, createdAt, id } = response.value;

    const detailed = safe_parse(DetailedThreadViewSchema, {
      watch_data: base_thread_data.value,
      applied_tags: appliedTags,
      created_at: createdAt,
      thread_id: id,
    });

    if (!detailed.isOk()) return err(detailed.error);

    this.redis.set(redis_id, JSON.stringify(detailed.value), 'EX', ThreadService.CACHE_TTL_SECONDS);

    return ok(detailed.value);
  }

  /**
   * Right now this function does not have any caching whatsoever.
   * this might be subject to change in the future.
   * TODO: consider caching here
   */
  async get_threads(guild_id: string, watched: boolean = true) {
    const data = await this.db.get_threads_in_guild(guild_id, watched);

    if (data.isOk()) {
      return ok(data.value);
    } else return err(data.error);
  }

  async set_thread_watch_status(thread_id: string, is_watched: boolean) {
    const result = await this.db.set_thread_watched(thread_id, is_watched);
    if (result.isOk()) {
      const cached_value = await this.redis.get(`thread:${thread_id}`);

      if (cached_value) {
        const parsed = safe_parse(FormattedThreadDataSchema, JSON.parse(cached_value));
        if (parsed.isErr()) return err(parsed.error);
        const as_obj = parsed.value;

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

    if (db_thread_entry.isErr()) return err(db_thread_entry.error);

    const is_watched = db_thread_entry.value && db_thread_entry.value.is_watched;

    if (db_thread_entry.value && db_thread_entry.value.is_watched) {
      const unwatch_result = await this.unwatch_thread(thread);
      if (unwatch_result.isErr()) return err(unwatch_result.error);
    } else {
      const watch_result = await this.watch_thread(thread);
      if (watch_result.isErr()) return err(watch_result.error);
    }

    return ok(!is_watched);
  }

  async delete_thread(thread_id: string) {
    this.redis.del(`thread:${thread_id}`);
    return this.db.delete_thread(thread_id);
  }
}
