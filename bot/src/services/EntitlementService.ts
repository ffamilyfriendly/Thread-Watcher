import { config } from '@providers/config';
import { logger } from '@providers/logger';
import { guild_service } from '@providers/services/guild_service';
import { BaseInteraction, Client, Collection, Entitlement } from 'discord.js';
import { Database } from '#/interfaces/Database';
import Redis from 'ioredis';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { map_err } from '#/utilities/error';
import { ShardedIpcClient } from '#/utilities/ipc_clients';
import RedisWrapper from '#/utilities/redis';
import z from 'zod';

export const TIER_PERMISSIONS = {
  [config.paywall.basic_sku]: [config.paywall.basic_sku],
};

type EntitlementResolution = Collection<string, Entitlement> | Entitlement[];

interface EntitlementProvider {
  fetch(guild_id: string): Promise<Result<EntitlementResolution, Error>>;
}

export class LocalClientProvider implements EntitlementProvider {
  constructor(private client: Client) {}
  async fetch(guild_id: string): Promise<Result<EntitlementResolution, Error>> {
    if (!this.client.application) return err(new Error('No app'));
    return ResultAsync.fromPromise(
      this.client.application.entitlements.fetch({ guild: guild_id, excludeEnded: true }),
      map_err,
    );
  }
}

export class IpcProvider implements EntitlementProvider {
  constructor(private ipc: ShardedIpcClient) {}
  async fetch(guild_id: string) {
    const ipc_res = await this.ipc.send_to_shard_having_guild<Entitlement[]>(
      guild_id,
      'get_entitlements',
      {
        guild_id,
      },
    );
    if (ipc_res.isErr()) return err(map_err(ipc_res.error));
    return ok(ipc_res.value);
  }
}

type HasSkuResponse = Promise<Result<boolean, Error>>;
export default class EntitlementService {
  r: RedisWrapper;
  l = logger.getSubLogger({ name: 'EntitlementService' });
  provider?: EntitlementProvider;

  constructor(
    private db: Database,
    redis: Redis,
  ) {
    this.r = new RedisWrapper(redis, 60, 'entitlement');
  }

  set_provider(new_provider: EntitlementProvider) {
    this.provider = new_provider;
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

  async has_premium(guild_id: string, interaction?: BaseInteraction): HasSkuResponse {
    if (!config.paywall.enabled) return ok(true);
    const sku_id = config.paywall.basic_sku;

    const alright = (v: boolean) => {
      this.r.set([guild_id, sku_id], v, z.boolean()).then((r) => {
        if (r.isErr()) {
          this.l.warn(`Could not set cached information for '${guild_id}'`, r.error);
        }
      });
      return ok(v);
    };

    // TODO: implement top.gg vote perks
    // a lot of the infra we need is alr implemented
    //const topgg_res = await this.get_topgg_vote_perk(guild_id);
    //if (topgg_res.isOk() && topgg_res.value && sku_id === config.paywall.basic_sku) {
    //  alright(true);
    //}

    const cache = await this.r.get([guild_id, sku_id], z.boolean());
    if (cache.isErr()) {
      this.l.warn(`Could not get cached information for '${guild_id}'`, cache.error);
    } else if (cache.value !== null) {
      this.l.silly(`Got value from cache: ${cache.value}`);
      return alright(cache.value);
    }

    const guild_sku = await this.get_db_granted_sku(guild_id);
    if (guild_sku.isErr()) {
      this.l.warn(`Could not get guild information for '${guild_id}'`, guild_sku.error);
    } else if (guild_sku.value === sku_id) {
      return alright(true);
    } else {
      this.l.silly(`guild has this sku: ${guild_sku.value}`);
    }

    let entitlements: Collection<string, Entitlement>;
    if (interaction) {
      entitlements = interaction.entitlements;
    } else {
      if (!this.provider) return err(new Error('No provider'));
      const res = await this.provider.fetch(guild_id);
      if (res.isErr()) return err(res.error);

      entitlements = Array.isArray(res.value)
        ? this.collection_from_entitlement_array(res.value)
        : res.value;
    }

    const has_active_sku = entitlements.some((e) => e.skuId === sku_id);

    return alright(has_active_sku);
  }
}
