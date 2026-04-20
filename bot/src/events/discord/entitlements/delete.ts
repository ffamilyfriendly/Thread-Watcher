import { Entitlement } from 'discord.js';
import { Event } from '#/interfaces/ClientEvent';
import { entitlement_service } from '@providers/services/entitlement_service';
import { logger } from '@providers/logger';

const event: Event<Entitlement> = {
  event_name: 'entitlementDelete',
  async event_callback(entitlement) {
    const existing = await entitlement_service.get_entitlement({
      external_id: entitlement.id,
      source: 'discord',
    });

    if (existing.isErr()) {
      logger.error('Failed to lookup entitlement for deletion', {
        external_id: entitlement.id,
        error: existing.error,
      });
      return;
    }
    if (!existing.value) {
      logger.warn('Received delete event for unknown entitlement', {
        external_id: entitlement.id,
        guild_id: entitlement.guildId,
      });
      return;
    }

    const result = await entitlement_service.update_entitlement(existing.value.entitlement_id, {
      status: 'EXPIRED',
      ends_at: new Date(),
      updated_at: new Date(),
    });

    if (result.isErr()) {
      logger.error('Failed to mark entitlement as EXPIRED', {
        entitlement_id: existing.value.entitlement_id,
        error: result.error,
      });
    } else {
      logger.info('Entitlement successfully revoked/expired', {
        guild_id: entitlement.guildId,
        sku_id: entitlement.skuId,
      });
    }
  },
};

export default event;
