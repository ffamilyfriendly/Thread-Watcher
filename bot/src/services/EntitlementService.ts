import { config } from '@providers/config';
import { logger } from '@providers/logger';
import { guild_service } from '@providers/services/guild_service';
import { BaseInteraction, Client, Collection, Entitlement } from 'discord.js';
import { Database } from 'interfaces/Database';
import Redis from 'ioredis';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { map_err } from 'utilities/error';
import { ShardedIpcClient } from 'utilities/ipc_clients';
import RedisWrapper from 'utilities/redis';
import z from 'zod';

export const TIER_PERMISSIONS = {
  [config.paywall.basic_sku]: [config.paywall.basic_sku, config.paywall.extended_sku],
  [config.paywall.extended_sku]: [config.paywall.extended_sku],
};

type HasSkuResponse = Promise<Result<boolean, Error>>;
export default class EntitlementService {
  r: RedisWrapper;
  l = logger.getSubLogger({ name: 'EntitlementService' });
  constructor(
    private db: Database,
    redis: Redis,
  ) {
    this.r = new RedisWrapper(redis, 60, 'entitlement');
  }

  async get_topgg_vote_perk(guild_id: string) {
    return this.r.get([guild_id, 'topgg'], z.boolean());
    //`entitlement:guild_id:topgg`
  }

  async get_db_granted_sku(guild_id: string) {
    const db_res = await guild_service.get_guild_info(guild_id);
    if (db_res.isErr()) return err(db_res.error);
    return ok(db_res.value?.granted_SKU ?? null);
  }

  async fetch_entitlements_from_client(guild_id: string, client: Client) {
    if (!client.application) return err(new Error('Client application not initialized'));

    return await ResultAsync.fromPromise(
      client.application.entitlements.fetch({
        guild: guild_id,
        excludeEnded: true,
      }),
      map_err,
    );
  }

  async fetch_entitlements_from_ipc(guild_id: string, ipc_client: ShardedIpcClient) {
    const entitlements = await ipc_client.send_to_shard_having_guild<Entitlement[]>(
      guild_id,
      'get_entitlements',
      {
        guild_id,
      },
    );
    if (entitlements.isErr()) return err(entitlements.error);
    return ok(entitlements.value);
  }

  private collection_from_entitlement_array(arr: Entitlement[]): Collection<string, Entitlement> {
    const rv = new Collection<string, Entitlement>();

    for (const entitlement of arr) {
      rv.set(entitlement.id, entitlement);
    }

    return rv;
  }

  async has_sku(sku_id: string, client: ShardedIpcClient, guild_id: string): HasSkuResponse;
  async has_sku(sku_id: string, client: Client, guild_id: string): HasSkuResponse;
  async has_sku(sku_id: string, interaction: BaseInteraction, guild_id?: string): HasSkuResponse;
  async has_sku(
    sku_id: string,
    v1: BaseInteraction | ShardedIpcClient | Client,
    guild_id?: string,
  ): HasSkuResponse {
    if (!config.paywall.enabled) return ok(true);

    const allowed_skus = TIER_PERMISSIONS[sku_id as keyof typeof TIER_PERMISSIONS] ?? [sku_id];

    if (v1 instanceof BaseInteraction && !v1.guildId)
      return err(new Error("'has_sku' can only accept guild interactions"));
    const gid = v1 instanceof BaseInteraction ? v1.guildId! : guild_id!;

    const alright = (v: boolean) => {
      this.r.set([gid, sku_id], v, z.boolean()).then((r) => {
        if (r.isErr()) {
          this.l.warn(`Could not set cached information for '${gid}'`, r.error);
        }
      });
      return ok(v);
    };

    const topgg_res = await this.get_topgg_vote_perk(gid);
    if (topgg_res.isOk() && topgg_res.value && sku_id === config.paywall.basic_sku) {
      alright(true);
    }

    const cache = await this.r.get([gid, sku_id], z.boolean());
    if (cache.isErr()) {
      this.l.warn(`Could not get cached information for '${gid}'`, cache.error);
    } else if (cache.value !== null) {
      this.l.silly(`Got value from cache: ${cache.value}`);
      return alright(cache.value);
    }

    const guild_sku = await this.get_db_granted_sku(gid);
    if (guild_sku.isErr()) {
      this.l.warn(`Could not get guild information for '${gid}'`, guild_sku.error);
    } else if (guild_sku.value && allowed_skus.includes(guild_sku.value)) {
      return alright(true);
    } else {
      this.l.silly(`guild has this sku: ${guild_sku.value}`);
    }

    let entitlements: Collection<string, Entitlement>;
    if (v1 instanceof BaseInteraction) {
      entitlements = v1.entitlements;
    } else {
      const resolve = await (v1 instanceof Client
        ? this.fetch_entitlements_from_client(gid, v1)
        : this.fetch_entitlements_from_ipc(gid, v1));
      if (resolve.isErr()) return err(map_err(resolve.error));

      entitlements = Array.isArray(resolve.value)
        ? this.collection_from_entitlement_array(resolve.value)
        : resolve.value;
    }

    const has_active_sku = entitlements.some((e) => allowed_skus.includes(e.skuId));

    return alright(has_active_sku);
  }

  async has_basic(v1: any, guild_id?: string) {
    return this.has_sku(config.paywall.basic_sku, v1, guild_id);
  }

  async has_extended(v1: any, guild_id?: string) {
    return this.has_sku(config.paywall.extended_sku, v1, guild_id);
  }

  async get_highest_sku(
    v1: any,
    guild_id?: string,
  ): Promise<Result<'EXTENDED' | 'BASIC' | 'NONE', Error>> {
    const has_extended = await this.has_extended(v1, guild_id);
    if (has_extended.isErr()) return err(has_extended.error);
    if (has_extended.value) return ok('EXTENDED');

    const has_basic = await this.has_basic(v1, guild_id);
    if (has_basic.isErr()) return err(has_basic.error);
    if (has_basic.value) return ok('BASIC');

    return ok('NONE');
  }
}
