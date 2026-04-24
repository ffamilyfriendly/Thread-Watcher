import { Entitlement } from 'discord.js';
import { Event } from '#/interfaces/ClientEvent';
import { entitlement_service } from '@providers/services/entitlement_service';
import { logger } from '@providers/logger';

const event: Event<Entitlement> = {
  event_name: 'entitlementCreate',
  async event_callback(entitlement) {
    const entitlement_create = await entitlement_service.create_entitlement({
      external_id: entitlement.id,
      sku_id: entitlement.skuId,
      guild_id: entitlement.guildId!,
      user_id: entitlement.userId,
      source: 'discord',
      status: 'ACTIVE',
      starts_at: entitlement.startsAt || new Date(),
      ends_at: entitlement.endsAt ?? null,
      updated_at: new Date(),
      raw: entitlement,
    });

    if (entitlement_create.isErr()) {
      logger.error(`could not insert discord entitlement`, {
        entitlement,
        error: entitlement_create.error,
      });
    } else {
      logger.info('entitlement created', {
        sku_id: entitlement.skuId,
        guild_id: entitlement.guildId,
        entitlement,
      });
    }
  },
};

export default event;
