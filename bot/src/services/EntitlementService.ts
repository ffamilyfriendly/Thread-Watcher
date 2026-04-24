import { config } from '@providers/config';
import { logger } from '@providers/logger';
import { guild_service } from '@providers/services/guild_service';
import { BaseInteraction, Client, Collection, Entitlement } from 'discord.js';
import { Database, EntitlementFilters, EntitlementInsertion } from '#/interfaces/Database';
import Redis from 'ioredis';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { map_err, mapped_err } from '#/utilities/error';
import { ShardedIpcClient } from '#/utilities/ipc_clients';
import RedisWrapper from '#/utilities/redis';
import z from 'zod';
import { GuildEntitlement, ZTopggWebhookSchema } from '@watcher/shared';

export const TIER_PERMISSIONS = {
  [config.paywall.basic_sku]: [config.paywall.basic_sku],
};

type HasSkuResponse = Promise<ResultAsync<boolean, Error>>;
export default class EntitlementService {
  r: RedisWrapper;
  l = logger.getSubLogger({ name: 'EntitlementService' });

  constructor(
    private db: Database,
    redis: Redis,
  ) {
    this.r = new RedisWrapper(redis, 60, 'entitlement');
  }

  // This is handled by our topgg webhook handler
  // see: /bot/src/web/routes/webhooks.ts for implementation.
  async get_topgg_vote_perk(guild_id: string) {
    return this.r.get([guild_id, 'topgg'], ZTopggWebhookSchema);
  }

  async get_entitlement_breakdown(guild_id: string) {
    const [topgg_res, premium_res] = await Promise.all([
      this.get_topgg_vote_perk(guild_id),
      this.has_premium(guild_id),
    ]);

    return Result.combine([topgg_res, premium_res]).map(([top, prem]) => {
      return {
        has_premium: prem,
        active_topgg_vote: top,
      };
    });
  }

  async get_topgg_vote_or_premium(guild_id: string) {
    const [prem_res, vote_res] = await Promise.all([
      this.has_premium(guild_id),
      this.get_topgg_vote_perk(guild_id),
    ]);

    if (prem_res.isErr())
      this.l.error(`Failed to check if ${guild_id} has premium`, prem_res.error);
    if (vote_res.isErr())
      this.l.error(`Failed to check if ${guild_id} has premium thru top.gg`, vote_res.error);

    return prem_res.unwrapOr(false) || vote_res.unwrapOr(false);
  }

  async get_entitlements(filters: EntitlementFilters) {
    return this.db.get_entitlements(filters);
  }

  async get_entitlement(filters: EntitlementFilters) {
    return this.db.get_entitlement(filters);
  }

  async upsert_entitlement(ext_id: string, data: EntitlementInsertion) {
    const existing = await this.get_entitlement({ external_id: ext_id });
    if (existing.isErr()) return err(existing.error);

    return existing.value
      ? this.update_entitlement(existing.value.entitlement_id, data)
      : this.create_entitlement(data);
  }

  async create_entitlement(entitlement: EntitlementInsertion) {
    return this.db.create_entitlement(entitlement);
  }

  async update_entitlement(rawr_entitlement_id: string, data: Partial<GuildEntitlement>) {
    // We're deconstructing here to get rid of the 'entitlement_id' field in the updated data.
    // we do not want to accidentally change the entitlement_id as that might create weird issues
    const { entitlement_id, ...rest } = data;
    return this.db.update_entitlement(rawr_entitlement_id, {
      entitlement_id: rawr_entitlement_id,
      ...rest,
    });
  }

  async delete_entitlement(entitlement_id: string) {
    return this.db.delete_entitlement(entitlement_id);
  }

  async has_premium(guild_id: string): HasSkuResponse {
    if (!config.paywall.enabled) return ok(true);
    const sku_id = config.paywall.basic_sku;

    return this.r.get_cached_or([guild_id, sku_id], z.boolean(), async () => {
      const guild_entitlements = await this.get_entitlements({ guild_id });
      if (guild_entitlements.isErr()) return mapped_err(guild_entitlements.error);

      const has_active_sku = guild_entitlements.value.some(
        (ge) =>
          ge.sku_id === config.paywall.basic_sku &&
          ge.status === 'ACTIVE' &&
          (!ge.ends_at || ge.ends_at > new Date()),
      );
      return ok(has_active_sku);
    });
  }
}
