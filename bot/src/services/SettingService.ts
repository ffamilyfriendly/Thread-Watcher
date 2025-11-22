import { Database } from 'interfaces/Database';
import Redis from 'ioredis';
import { err, ok, ResultAsync } from 'neverthrow';
import { map_err } from 'utilities/error';

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

  constructor(
    private db: Database,
    private redis: Redis,
  ) {}

  /**
   * Internal helper: read a single setting from Redis.
   *
   * @internal
   * @template T The expected parsed type returned from the cache.
   * @param guild_id The guild identifier.
   * @param setting_key The setting key.
   * @returns A ResultAsync that resolves to the parsed value (T) or null if not found, or an error if the Redis call fails.
   */
  private async get_setting_redis<T>(guild_id: string, setting_key: string) {
    return ResultAsync.fromPromise(
      this.redis.get(`settings:${guild_id}:${setting_key}`),
      map_err,
    ).map((ok_val) => (ok_val !== null ? (JSON.parse(ok_val) as T) : null));
  }

  /**
   * Internal helper: write a single setting to Redis with an expiration.
   *
   * @internal
   * @param guild_id The guild identifier.
   * @param setting_key The setting key.
   * @param setting_value The value to serialize and store in Redis.
   * @returns A ResultAsync that resolves when the Redis SET completes or an error if the Redis call fails.
   */
  private set_setting_redis(guild_id: string, setting_key: string, setting_value: unknown) {
    return ResultAsync.fromPromise(
      this.redis.set(
        `settings:${guild_id}:${setting_key}`,
        JSON.stringify(setting_value),
        'EX',
        SettingService.CACHE_TTL_SECONDS,
      ),
      map_err,
    );
  }

  /**
   * Get a setting for a guild.
   *
   * This method:
   * - Tries the Redis cache first.
   * - If the cache contains a value, returns it immediately.
   * - On cache miss, queries the Database and, if successful, updates Redis with the DB value.
   *
   * @template T The expected return type of the setting.
   * @param guild_id The guild identifier whose setting is being requested.
   * @param setting_key The key identifying the setting.
   * @returns A Promise resolving to a neverthrow Result containing the setting value (possibly null if not set) on success,
   *          or an error result if either Redis or the Database operation failed.
   */
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

  /**
   * Get a setting for a guild, returning a default when the setting is null or undefined.
   *
   * Convenience wrapper around get_setting that maps null/undefined to the provided default_value.
   *
   * @template T The expected return type of the setting.
   * @param guild_id The guild identifier.
   * @param setting_key The key identifying the setting.
   * @param default_value The value to return when the stored setting is null or undefined.
   * @returns A Promise resolving to a neverthrow Result containing either the stored value or default_value on success,
   *          or an error result if the underlying operations fail.
   */
  async get_setting_with_default<T>(guild_id: string, setting_key: string, default_value: T) {
    return (await this.get_setting<T>(guild_id, setting_key)).map((v) => (v ?? default_value) as T);
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
  async set_setting<T>(guild_id: string, setting_key: string, setting_value: T) {
    this.set_setting_redis(guild_id, setting_key, setting_value);

    return this.db.set_guild_setting_value(guild_id, setting_key, setting_value);
  }
}

export enum SETTINGS_KEYS {
  'logging_channel' = 'LOGGING_CHANNEL',
  'bump_behaviour' = 'BUMP_BEHAVIOUR',
}
