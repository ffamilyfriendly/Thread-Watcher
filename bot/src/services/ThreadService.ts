import { logger } from '@providers/logger';
import { FilterData, ThreadSearchData, ZThreadData } from '@watcher/shared';
import { Client, ThreadChannel } from 'discord.js';
import { Database } from 'interfaces/Database';
import Redis from 'ioredis';
import { err, ok, ResultAsync } from 'neverthrow';
import { map_err } from 'utilities/error';
import RedisWrapper from 'utilities/redis';

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

export default class ThreadService {
  static readonly CACHE_TTL_SECONDS = 900;
  private r: RedisWrapper;

  constructor(
    private db: Database,
    redis: Redis,
  ) {
    this.r = new RedisWrapper(redis, ThreadService.CACHE_TTL_SECONDS, 'thread');
  }

  async insert_thread(thread: GenericThread, managed_by?: string) {
    const last_activity = thread.lastMessageId
      ? convert_snowflake_to_date(thread.lastMessageId)
      : thread.createdAt;

    const expires_at = get_stale_timestamp(
      thread.autoArchiveDuration ?? 0,
      last_activity ?? undefined,
    );

    const thread_data = {
      thread_id: thread.id,
      guild_id: thread.guildId,
      parent_channel_id: thread.parentId,
      due_archive: expires_at,
      managed_by,
    };

    const res = await this.db.insert_thread(thread_data);

    if (res.isOk()) this.r.set(thread.id, thread_data, ZThreadData);

    return res;
  }

  async get_thread(thread_id: string, with_cache = true) {
    if (with_cache) {
      const cached = await this.r.get(thread_id, ZThreadData);
      if (cached.isOk() && cached.value) return ok(cached.value);
    }

    const data = await this.db.get_thread(thread_id);

    if (data.isErr()) return err(data.error);

    this.r.set(thread_id, data.value, ZThreadData);

    return ok(data.value);
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

  async get_filtered_threads(guild_id: string, filters: ThreadSearchData) {
    return this.db.get_paginated_threads_in_guild(guild_id, 20, filters);
  }

  async get_count_threads(guild_id: string) {
    return await this.db.get_watched_threads_count(guild_id);
  }

  get_stale_threads() {
    return this.db.get_stale_threads();
  }

  get_stale_threads_for_guilds(guild_ids: string[]) {
    return this.db.get_stale_threads_for_guilds(guild_ids);
  }

  async set_thread_watch_status(thread_id: string, is_watched: boolean) {
    const result = await this.db.set_thread_watched(thread_id, is_watched);
    if (result.isOk()) {
      await this.r.del(thread_id);
    }

    return result;
  }

  async set_bump_thread_time(thread_id: string, auto_archive_duration: number) {
    const expires_at = get_stale_timestamp(auto_archive_duration, new Date());
    const result = await this.db.set_thread_auto_archive(thread_id, expires_at);

    if (result.isOk()) {
      const cached_value = await this.r.get(thread_id, ZThreadData);

      if (cached_value.isOk() && cached_value.value) {
        const as_obj = cached_value.value;

        as_obj.due_archive = expires_at;
        this.r.set(thread_id, as_obj, ZThreadData);
      }
    }

    return result;
  }

  async bump_thread_time(thread: GenericThread) {
    return this.set_bump_thread_time(thread.id, thread.autoArchiveDuration ?? 0);
  }

  async set_manager(thread_id: string, mgr?: string) {
    return this.db.set_thread_manager(thread_id, mgr);
  }

  /**
   *
   * @param is_managed_by_parent if the thread was watched as a result of a channel monitor
   * @returns
   */
  async watch_thread(thread: GenericThread, managed_by?: string) {
    const db_entry = await this.get_thread(thread.id, false);
    if (db_entry.isErr()) return err(db_entry.error);

    if (!db_entry.value) return (await this.insert_thread(thread, managed_by)).map(() => true);

    // Here we're setting managed_by to null if "managed_by" is undefined as we want a manual watch to override any monitors
    if (!managed_by && db_entry.value.managed_by) {
      this.set_manager(thread.id).then((r) => {
        if (r.isErr()) {
          logger.warn('could not unbind manager on watch_thread', thread.id, r.error);
        }
      });
    }

    if (db_entry.value.is_watched) return ok(false);

    return (await this.set_thread_watch_status(thread.id, true)).map(() => true);
  }

  async unwatch_thread(thread: GenericThread, remove_manager = false) {
    const db_entry = await this.get_thread(thread.id, false);
    if (db_entry.isErr()) return err(db_entry.error);

    if (remove_manager && db_entry.value?.managed_by) {
      this.set_manager(thread.id).then((r) => {
        if (r.isErr()) {
          logger.warn('could not unbind manager on unwatch_thread', thread.id, r.error);
        }
      });
    }

    if (db_entry.value === null || !db_entry.value.is_watched) return ok(false);

    return (await this.set_thread_watch_status(thread.id, false)).map(() => true);
  }

  async toggle_thread_watch_status(thread: GenericThread) {
    const db_thread_entry = await this.get_thread(thread.id, false);

    if (db_thread_entry.isErr()) return err(db_thread_entry.error);

    const is_watched = db_thread_entry.value && db_thread_entry.value.is_watched;

    if (db_thread_entry.value && db_thread_entry.value.is_watched) {
      const unwatch_result = await this.unwatch_thread(thread, true);
      if (unwatch_result.isErr()) return err(unwatch_result.error);
    } else {
      const watch_result = await this.watch_thread(thread);
      if (watch_result.isErr()) return err(watch_result.error);
    }

    return ok(!is_watched);
  }

  async delete_thread(thread_id: string) {
    this.r.del(thread_id);
    return this.db.delete_thread(thread_id);
  }

  static async should_be_watched(client: Client, thread: ThreadChannel, filters: FilterData) {
    if (thread.locked) return ok(false);

    logger.silly('should_be_watched', thread.id, filters);

    const name_matches_regex = filters.regex?.test(thread.name) ?? true;

    const thread_guild = await ResultAsync.fromPromise(
      client.guilds.fetch(thread.guildId),
      map_err,
    );
    if (thread_guild.isErr()) return err(thread_guild.error);

    const thread_owner = await ResultAsync.fromPromise(
      thread_guild.value.members.fetch(thread.ownerId),
      map_err,
    );
    if (thread_owner.isErr()) return err(thread_owner.error);

    const author_has_role = !!thread_owner.value.roles.cache.find((r) =>
      filters.role_whitelist?.includes(r.id),
    );

    const tag_list_as_ids = thread.appliedTags?.map((r) => r);
    const thread_has_tag = !!tag_list_as_ids.find((t) => filters.tags?.includes(t));

    const role_thing =
      filters.role_whitelist && filters.role_whitelist.length !== 0 ? author_has_role : true;
    const tag_thing = filters.tags && filters.tags.length !== 0 ? thread_has_tag : true;

    return ok(name_matches_regex && role_thing && tag_thing);
  }
}
