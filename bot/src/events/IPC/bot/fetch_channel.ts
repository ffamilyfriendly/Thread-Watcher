import { client } from '@providers/client';
import { PrivateEvent } from '#/interfaces/PrivateEvents';
import { err, ok, ResultAsync } from 'neverthrow';
import { map_err } from '#/utilities/error';

const event: PrivateEvent<{
  channel_id: string;
}> = {
  event_name: 'fetch_channel',
  async event_callback({ channel_id }) {
    const channel = await ResultAsync.fromPromise(client.channels.fetch(channel_id), map_err);

    if (channel.isErr()) return err(channel.error);

    return ok(channel.value?.toJSON());
  },
};

export default event;
