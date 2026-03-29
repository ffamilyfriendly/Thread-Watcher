import { event_bus } from '@providers/event_bus';
import { AuditData } from '@watcher/shared';
import { Database } from 'interfaces/Database';
import settings_map, { SettingValue } from 'interfaces/Settings';
import Redis from 'ioredis';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { map_err } from 'utilities/error';
import { safe_parse } from 'utilities/parsing';
import RedisWrapper from 'utilities/redis';
import { AuditMeta } from './AuditService';

/**
 * Service responsible for reading and writing guild-scoped settings with a Redis cache layer.
 *
 * Behavior:
 * - Attempts to read settings from Redis cache first using the key pattern `settings:{guild_id}:{setting_key}`.
 * - If a cached value is present, returns it.
 * - If cache miss occurs, reads from the provided Database implementation and, on success, updates Redis cache.
 * - When setting a value, the DB write is awaited while the cache write is started but not awaited (fire-and-forget).
 *
 * Notes:
 * - All Redis interactions are performed through ResultAsync wrappers and map errors via utilities/error.map_err.
 * - Cached entries expire after CACHE_TTL_SECONDS.
 *
 * @remarks This class is agnostic to the concrete Database implementation and relies on the provided interfaces/Database API.
 */
export default class SettingService {
  /**
   * Seconds that a cached setting remains valid in Redis.
   *
   * @remarks Adjust this constant to change cache TTL for all settings operations.
   */
  static readonly CACHE_TTL_SECONDS = 900;
  private r: RedisWrapper;

  constructor(
    private db: Database,
    private redis: Redis,
  ) {
    this.r = new RedisWrapper(redis, SettingService.CACHE_TTL_SECONDS, 'settings');
  }

  get_adapter(settings_key: string) {
    return settings_map.get(settings_key)?.adapter;
  }

  async get_setting<T extends SettingValue>(
    guild_id: string,
    setting_key: string,
  ): Promise<Result<T | null, unknown>> {
    const config = settings_map.get(setting_key);
    if (!config) return err(new Error(`Unknown setting: ${setting_key}`));

    const cached = await this.r.get([guild_id, setting_key], config.schema);
    if (cached.isOk() && cached.value) return ok(cached.value as T);

    const db_res = await this.db.get_guild_setting_value(guild_id, setting_key);
    if (db_res.isErr()) return err(db_res.error);
    if (!db_res.value) return ok(config.default as T);

    return safe_parse(config.schema, db_res.value).map((parsed) => {
      this.r.set([guild_id, setting_key], parsed, config.schema);
      return parsed as T;
    });
  }

  async get_guild_settings(guild_id: string) {
    const settings = await this.db.get_guild_settings(guild_id);

    if (settings.isErr()) return err(settings.error);

    return ok(settings.value);
  }

  /**
   * Set a guild setting.
   *
   * Behavior:
   * - Initiates a Redis cache update (not awaited) to keep cache and DB in sync.
   * - Writes the value to the Database and returns the DB result.
   *
   * @template T The type of the value being stored.
   * @param guild_id The guild identifier.
   * @param setting_key The key identifying the setting.
   * @param setting_value The value to store.
   * @returns A Promise resolving to a neverthrow Result indicating success or failure of the Database write.
   */
  async set_setting(
    guild_id: string,
    setting_key: string,
    setting_value: unknown,
    audit: AuditMeta,
  ) {
    const config = settings_map.get(setting_key);
    if (!config) return err(new Error(`Unknown setting: ${setting_key}`));

    const parse_res = config.schema.safeParse(setting_value);
    if (!parse_res.success)
      return err(
        new Error(`value '${setting_value}' is not the expected type for '${setting_key}'`),
      );

    const value_as_str = config.adapter.to_string(parse_res.data);
    if (value_as_str.isErr()) return err(value_as_str.error);

    const db_res = await this.db.set_guild_setting_value(guild_id, setting_key, value_as_str.value);
    if (db_res.isOk()) {
      this.r.set([guild_id, setting_key], setting_value, config.schema);

      event_bus.emit('config:change', {
        ...audit,
        data: {
          audit_type: 'CONFIG',
          setting_key,
          old_value: db_res.value,
          new_value: String(setting_value),
        },
      });
    }

    return db_res;
  }

  async set_settings(guild_id: string, settings: Record<string, unknown>, audit: AuditMeta) {
    const update_promises = Object.entries(settings).map(([key, value]) => {
      if (!this.get_adapter(key)) return ok(null);
      return this.set_setting(guild_id, key, value, audit);
    });

    const results = await Promise.all(update_promises);

    for (const res of results) {
      if (res.isErr()) return err(res.error);
    }

    return ok();
  }

  async remove_setting(guild_id: string, setting_key: string, audit: AuditMeta) {
    const promises = Promise.all([
      this.db.delete_guild_setting_value(guild_id, setting_key),
      this.r.del([guild_id, setting_key]),
    ]);

    return ResultAsync.fromPromise(promises, map_err);
  }
}

export enum SETTINGS_KEYS {
  'logging_channel' = 'LOGGING_CHANNEL',
  'bump_behaviour' = 'BUMP_BEHAVIOUR',
}
