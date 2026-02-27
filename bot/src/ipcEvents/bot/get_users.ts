import { client } from '@providers/client';
import { User } from 'discord.js';
import { PrivateEvent } from 'interfaces/PrivateEvents';
import { err, ok, ResultAsync } from 'neverthrow';
import { map_err } from 'utilities/error';

const event: PrivateEvent<{
  user_ids: string[];
}> = {
  event_name: 'get_users',
  async event_callback({ user_ids }) {
    let promises: Promise<User>[] = [];

    for (const user_id of user_ids) {
      promises.push(client.users.fetch(user_id));
    }

    const promises_result = await ResultAsync.fromPromise(Promise.all(promises), map_err);

    if (promises_result.isErr()) {
      return err(promises_result.error);
    }

    return ok(promises_result.value.map((user) => user.toJSON()));
  },
};

export default event;
