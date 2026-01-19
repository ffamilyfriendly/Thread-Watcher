import { client } from '@providers/client';
import { PrivateEvent } from 'interfaces/PrivateEvents';
import { err, ok, ResultAsync } from 'neverthrow';
import { map_err } from 'utilities/error';

const event: PrivateEvent<{
  guild_id: string;
}> = {
  event_name: 'fetch_channels',
  async event_callback({ guild_id }) {
    const channels = await ResultAsync.fromPromise(client.guilds.fetch(guild_id), map_err);

    if (channels.isErr()) return err(channels.error);

    return ok(channels.value.channels.cache.map((c) => c.toJSON()));
  },
};

export default event;
