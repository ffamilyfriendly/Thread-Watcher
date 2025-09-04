import { Database } from 'interfaces/Database';
import Redis from 'ioredis';
import { err, ok, ResultAsync } from 'neverthrow';

/**
 * Service for managing guild-specific settings with caching via Redis.
 *
 * This service provides methods to get and set settings for a guild,
 * utilizing Redis for caching and a database for persistent storage.
 *
 * @remarks
 * - Cached settings expire after {@link SettingService.CACHE_TTL_SECONDS} seconds.
 * - All methods are asynchronous and return results wrapped in a `ResultAsync` or similar pattern.
 *
 * @example
 * ```typescript
 * const value = await settingService.get_setting('874566459429355581', 'log_channel');
 * ```
 */
export default class SettingService {
  static readonly CACHE_TTL_SECONDS = 900;

  constructor(
    private db: Database,
    private redis: Redis,
  ) {}

  private async get_setting_redis<T>(guild_id: string, setting_key: string) {
    return ResultAsync.fromSafePromise(this.redis.get(`settings:${guild_id}:${setting_key}`)).map(
      (ok_val) => (ok_val !== null ? (JSON.parse(ok_val) as T) : null),
    );
  }

  private set_setting_redis(guild_id: string, setting_key: string, setting_value: unknown) {
    return ResultAsync.fromSafePromise(
      this.redis.set(
        `settings:${guild_id}:${setting_key}`,
        JSON.stringify(setting_value),
        'EX',
        SettingService.CACHE_TTL_SECONDS,
      ),
    );
  }

  async get_setting<T>(guild_id: string, setting_key: string) {
    const cache_entry = await this.get_setting_redis(guild_id, setting_key);
    if (cache_entry.isErr()) return err(cache_entry.error);
    if (cache_entry.value) return ok(cache_entry.value as T);

    const settings_value = await this.db.get_guild_setting_value<T>(guild_id, setting_key);

    if (settings_value.isOk()) {
      const redis_response = await this.set_setting_redis(
        guild_id,
        setting_key,
        settings_value.value,
      );
      if (redis_response.isErr()) return err(redis_response);
    }

    return settings_value;
  }

  async get_setting_with_default<T>(guild_id: string, setting_key: string, default_value: T) {
    return (await this.get_setting<T>(guild_id, setting_key)).map((v) => (v ?? default_value) as T);
  }

  async set_setting<T>(guild_id: string, setting_key: string, setting_value: T) {
    this.set_setting_redis(guild_id, setting_key, setting_value);

    return this.db.set_guild_setting_value(guild_id, setting_key, setting_value);
  }
}

export enum SETTINGS_KEYS {
  'logging_channel' = 'LOGGING_CHANNEL',
}
