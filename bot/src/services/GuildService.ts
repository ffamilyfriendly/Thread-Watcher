import { ZGuild } from '@watcher/shared';
import { Database } from 'interfaces/Database';
import Redis from 'ioredis';
import { err, ok } from 'neverthrow';
import RedisWrapper from 'utilities/redis';

export default class GuildService {
  static readonly CACHE_TTL_SECONDS = 900;
  private r: RedisWrapper;
  constructor(
    private db: Database,
    redis: Redis,
  ) {
    this.r = new RedisWrapper(redis, GuildService.CACHE_TTL_SECONDS, 'guildinf');
  }

  async get_guild_info(guild_id: string) {
    const cached = await this.r.get_non_nullable(guild_id, ZGuild);
    // We want to return cached nulls as well for this
    if (cached.isOk()) return ok(cached.value);

    const db_res = await this.db.get_guild_info(guild_id);
    if (db_res.isErr()) return err(db_res.error);

    this.r.set(guild_id, db_res.value, ZGuild.nullable());

    return ok(db_res.value);
  }

  async set_left_at(guild_id: string) {
    this.r.del(guild_id);
    return this.db.upsert_guild_info(guild_id, { left_at: new Date() });
  }

  async set_guild_SKU(guild_id: string, SKU: string | null) {
    this.r.del(guild_id);
    return this.db.upsert_guild_info(guild_id, { granted_SKU: SKU });
  }

  async nullify_left_at(guild_id: string) {
    const db_res = await this.get_guild_info(guild_id);
    if (db_res.isErr()) return err(db_res.error);
    if (db_res.isOk() && !db_res.value) return ok();

    this.r.del(guild_id);
    return this.db.upsert_guild_info(guild_id, {
      left_at: null,
    });
  }
}
