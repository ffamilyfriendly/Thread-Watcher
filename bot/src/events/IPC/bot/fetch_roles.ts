import { client } from '@providers/client';
import { PrivateEvent } from '#/interfaces/PrivateEvents';
import { err, ok, ResultAsync } from 'neverthrow';
import { map_err } from '#/utilities/error';

const event: PrivateEvent<{
  guild_id: string;
}> = {
  event_name: 'fetch_roles',
  async event_callback({ guild_id }) {
    const roles = await ResultAsync.fromPromise(client.guilds.fetch(guild_id), map_err);

    if (roles.isErr()) return err(roles.error);
    return ok(roles.value.roles.cache.map((r) => r.toJSON()));
  },
};

export default event;
