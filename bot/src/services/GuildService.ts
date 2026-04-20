import { Guild, ZGuild, ZGuildWithEntitlement } from '@watcher/shared';
import { Database } from '#/interfaces/Database';
import Redis from 'ioredis';
import { err, ok } from 'neverthrow';
import RedisWrapper from '#/utilities/redis';
import { mapped_err } from '#/utilities/error';

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
    return this.r.get_cached_or(guild_id, ZGuildWithEntitlement.nullable(), async () => {
      const r = await this.db.get_guild_info(guild_id);
      if (r.isErr()) return mapped_err(r.error);
      return ok(r.value);
    });
  }

  async deduct_ai_tokens(guild_id: string, amount: number) {
    this.r.del(guild_id);
    const guild = await this.get_guild_info(guild_id);
    if (guild.isErr()) return err(guild.isErr());
    if (!guild.value) return err('Guild not found!');
    const g = guild.value;

    let remaining_to_deduct = amount;

    if (g.monthly_budget_eurocents > 0) {
      const deduct = Math.min(g.monthly_budget_eurocents, remaining_to_deduct);
      g.monthly_budget_eurocents -= deduct;
      remaining_to_deduct -= deduct;
    }

    if (remaining_to_deduct > 0) {
      g.persistent_budget_eurocents = Math.max(
        g.persistent_budget_eurocents - remaining_to_deduct,
        0,
      );
    }

    return this.db.upsert_guild_info(guild_id, {
      monthly_budget_eurocents: g.monthly_budget_eurocents,
      persistent_budget_eurocents: g.persistent_budget_eurocents,
    });
  }

  async update_guild(the_guild_id_fr_twn: string, updated_values: Partial<Guild>) {
    this.r.del(the_guild_id_fr_twn);
    const { guild_id, ...update } = updated_values;
    return this.db.upsert_guild_info(the_guild_id_fr_twn, update);
  }

  async set_persistent_ai_tokens(guild_id: string, amount: number) {
    return this.update_guild(guild_id, { persistent_budget_eurocents: amount });
  }

  async set_monthly_tokens(guild_id: string, amount: number) {
    return this.update_guild(guild_id, {
      monthly_budget_eurocents: amount,
      monthly_budget_last_granted: new Date(),
    });
  }

  async set_left_at(guild_id: string) {
    return this.update_guild(guild_id, { left_at: new Date() });
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
