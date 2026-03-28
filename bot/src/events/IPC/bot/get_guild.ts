import { client } from '@providers/client';
import { PrivateEvent } from 'interfaces/PrivateEvents';
import { err, ok, ResultAsync } from 'neverthrow';
import { map_err } from 'utilities/error';

const event: PrivateEvent<{
  guild_id: string;
}> = {
  event_name: 'get_guild',
  async event_callback({ guild_id }) {
    if (!client.application) return err(new Error('Client not ready'));

    return await ResultAsync.fromPromise(client.guilds.fetch(guild_id), map_err).andThen((g) => {
      return ok(g.toJSON());
    });
  },
};

export default event;
