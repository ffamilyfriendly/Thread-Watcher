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
import { ZTopggWebhookSchema } from '@watcher/shared';

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

type HasSkuResponse = Promise<ResultAsync<boolean, Error>>;
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

  // This value is set on the sveltekit route handling webhooks!
  // see: /web/src/routes/api/webhooks/topgg/+server.ts for implementation.
  async get_topgg_vote_perk(guild_id: string) {
    return this.r.get([guild_id, 'topgg'], ZTopggWebhookSchema);
  }

  async get_topgg_vote_or_premium(guild_id: string, interaction?: BaseInteraction) {
    const [prem_res, vote_res] = await Promise.all([
      this.has_premium(guild_id, interaction),
      this.get_topgg_vote_perk(guild_id),
    ]);

    if (prem_res.isErr())
      this.l.error(`Failed to check if ${guild_id} has premium`, prem_res.error);
    if (vote_res.isErr())
      this.l.error(`Failed to check if ${guild_id} has premium thru top.gg`, vote_res.error);

    return prem_res.unwrapOr(false) || vote_res.unwrapOr(false);
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

    return this.r.get_cached_or([guild_id, sku_id], z.boolean(), async () => {
      const guild_sku = await this.get_db_granted_sku(guild_id);
      if (guild_sku.isErr()) {
        this.l.error(`could not get db granted premium for guild ${guild_id}`, guild_sku.error);
      }

      if (guild_sku.isOk() && guild_sku.value === sku_id) return ok(true);

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
      return ok(has_active_sku);
    });
  }
}
