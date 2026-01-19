import { client } from '@providers/client';
import { PrivateEvent } from 'interfaces/PrivateEvents';
import { err, ok, ResultAsync } from 'neverthrow';
import { map_err } from 'utilities/error';

const event: PrivateEvent<{
  guild_id: string;
}> = {
  event_name: 'get_entitlements',
  async event_callback({ guild_id }) {
    if (!client.application) return err(new Error('Client not ready'));

    const entitlements = await ResultAsync.fromPromise(
      client.application.entitlements.fetch({
        guild: guild_id,
        excludeEnded: true,
      }),
      map_err,
    );

    if (entitlements.isErr()) return err(entitlements.error);

    return ok(entitlements.value.toJSON());
  },
};

export default event;
