import guild_service from '@providers/services/guild_service';
import { Entitlement, Guild } from 'discord.js';
import { Event } from '#/interfaces/ClientEvent';
import { entitlement_service } from '@providers/services/entitlement_service';
import { logger } from '@providers/logger';
import { err, ok } from 'neverthrow';

const event: Event<Entitlement, Entitlement> = {
  event_name: 'entitlementUpdate',
  async event_callback(old_entitlement, new_entitlement) {
    const entitlement = await entitlement_service.get_entitlement({
      external_id: new_entitlement.id,
      source: 'discord',
    });
    if (entitlement.isErr()) {
      logger.error('could not fetch active discord entitlement', {
        error: entitlement.error,
        guild_id: new_entitlement.guildId,
        user_id: new_entitlement.userId,
        entitlement_id: new_entitlement.id,
      });
      return err(entitlement.error);
    }

    if (!entitlement.value) {
      logger.warn('current entitlement was null', {
        guild_id: new_entitlement.guildId,
        user_id: new_entitlement.userId,
        entitlement_id: new_entitlement.id,
      });
      return ok();
    }

    const entitlement_update = await entitlement_service.update_entitlement(
      entitlement.value.entitlement_id,
      {
        ends_at: new_entitlement.endsAt ?? null,
        status: new_entitlement.deleted ? 'EXPIRED' : 'ACTIVE',
        updated_at: new Date(),
      },
    );

    if (entitlement_update.isErr()) {
      logger.error(`could not update discord entitlement`, {
        entitlement,
        error: entitlement_update.error,
      });
    } else {
      logger.info('entitlement updated', {
        sku_id: new_entitlement.skuId,
        guild_id: new_entitlement.guildId,
        entitlement,
      });
    }
  },
};

export default event;
