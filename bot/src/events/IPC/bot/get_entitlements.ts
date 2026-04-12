import { client } from '@providers/client';
import { entitlement_service } from '@providers/services/entitlement_service';
import { PrivateEvent } from '#/interfaces/PrivateEvents';
import { err, ok } from 'neverthrow';

const event: PrivateEvent<{
  guild_id: string;
}> = {
  event_name: 'get_entitlements',
  async event_callback({ guild_id }) {
    const entitlements = await entitlement_service.fetch_entitlements_from_client(guild_id, client);

    if (entitlements.isErr()) return err(entitlements.error);

    return ok(entitlements.value.toJSON());
  },
};

export default event;
