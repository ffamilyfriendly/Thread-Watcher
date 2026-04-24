import { map_err } from '#/utilities/error';
import { config } from '@providers/config';
import { logger } from '@providers/logger';
import { entitlement_service } from '@providers/services/entitlement_service';
import { Entitlement, REST, Routes } from 'discord.js';
import { err, ok, ResultAsync } from 'neverthrow';
import { schedule } from 'node-cron';
import z from 'zod';

const rest = new REST().setToken(config.tokens.discord);
const l = logger.getSubLogger({ name: 'reconsile_payments' });

const EntitlementTypeMap = {
  1: 'PURCHASE',
  2: 'PREMIUM_SUBSCRIPTION',
  3: 'DEVELOPER_GIFT',
  4: 'TEST_MODE_PURCHASE',
  5: 'FREE_PURCHASE',
  6: 'USER_GIFT',
  7: 'PREMIUM_PURCHASE',
  8: 'APPLICATION_SUBSCRIPTION',
} as const;

type EntitlementTypeStrings =
  | (typeof EntitlementTypeMap)[keyof typeof EntitlementTypeMap]
  | 'UNKNOWN';

function isKnownType(n: number): n is keyof typeof EntitlementTypeMap {
  return n in EntitlementTypeMap;
}

const ZRawDiscordEntitlement = z.object({
  id: z.string(),
  sku_id: z.string(),
  user_id: z.string().nullish(),
  guild_id: z.string().nullish(),
  type: z.number().transform<EntitlementTypeStrings>((inp): EntitlementTypeStrings => {
    if (isKnownType(inp)) return EntitlementTypeMap[inp];
    return 'UNKNOWN';
  }),
  deleted: z.boolean(),
  starts_at: z.coerce.date(),
  ends_at: z.coerce.date().nullish(),
  consumed: z.boolean().nullish(),
});

/*
    This will fetch 100 entitlements from discord.
    I don't anticipate hitting problems with this "out of the blue" but it's worthy to note.
    If we ever hit issues with this, firstly congrats and also sorry but u gotta page this data now :D
*/
async function reconsile_discord_payments() {
  l.silly('reconsiling payments.');
  const entitlements = await ResultAsync.fromPromise(
    rest.get(Routes.entitlements(config.clientID), {
      query: new URLSearchParams({ exclude_ended: 'false' }),
    }),
    map_err,
  );

  if (entitlements.isErr()) {
    l.error('failed fetch', {
      error: entitlements.error,
    });
    return err(entitlements.error);
  }

  const parsed = z.array(ZRawDiscordEntitlement).safeParse(entitlements.value);
  if (!parsed.success) {
    l.error('failed parse', {
      err: parsed.error,
      raw_body: entitlements.value,
    });
    return err(parsed.error);
  }

  const ents = parsed.data;
  if (ents.length > 0)
    l.info(`Reconsiling`, {
      amount: ents.length,
    });

  if (ents.length > 70 && ents.length < 100) {
    l.warn('nearing limit', {
      limit: 100,
      entries: ents.length,
    });
  } else if (ents.length >= 100) {
    l.error('limit hit', {
      limit: 100,
      entries: ents.length,
    });
  }

  let promises: Promise<unknown>[] = [];

  for (const e of ents) {
    if (!e.guild_id) {
      logger.warn('no guild_id', {
        entitlement: e,
      });
      continue;
    }

    const is_expired = e.ends_at && e.ends_at < new Date();
    const status = e.deleted || is_expired ? 'EXPIRED' : 'ACTIVE';

    const prom = entitlement_service.upsert_entitlement(e.id, {
      external_id: e.id,
      starts_at: e.starts_at,
      ends_at: e.ends_at,
      guild_id: e.guild_id,
      user_id: e.user_id,
      sku_id: e.sku_id,
      source: e.type === 'DEVELOPER_GIFT' ? 'dev_granted' : 'discord',
      updated_at: new Date(),
      status: status,
    });
    promises.push(prom);
  }

  const update_res = await ResultAsync.fromPromise(Promise.all(promises), map_err);

  if (update_res.isErr()) {
    l.error('upsert error', {
      err: update_res.error,
      amount_entries: promises.length,
    });
    return err(update_res.error);
  }

  return ok();
}

export function start_reconsile_payments() {
  reconsile_discord_payments();
  schedule(config.paywall.reconsile_payments_schedule, reconsile_discord_payments);
}
