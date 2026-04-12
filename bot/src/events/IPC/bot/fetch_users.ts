import { client } from '@providers/client';
import { define_secure_event } from '#/interfaces/PrivateEvents';
import { ResultAsync, ok, err } from 'neverthrow';
import { map_err } from '#/utilities/error';

export default define_secure_event('fetch_users', async (data) => {
  const guild_res = await ResultAsync.fromPromise(client.guilds.fetch(data.guild_id), map_err);
  if (guild_res.isErr()) return err(guild_res.error);
  const users = await ResultAsync.fromPromise(
    guild_res.value.members.fetch({ user: data.user_ids }),
    map_err,
  );
  if (users.isErr()) return err(users.error);

  return ok(
    users.value
      .values()
      .toArray()
      .map((member) => member.user),
  );
});
