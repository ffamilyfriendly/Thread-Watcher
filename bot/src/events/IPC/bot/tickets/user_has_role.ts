import { client } from '@providers/client';
import { define_secure_event } from 'interfaces/PrivateEvents';
import { err, ok, ResultAsync } from 'neverthrow';
import { map_err } from 'utilities/error';

export default define_secure_event('user_has_role', async ({ role_ids, user_id, guild_id }) => {
  const guild_res = await ResultAsync.fromPromise(client.guilds.fetch(guild_id), map_err);
  if (guild_res.isErr()) return err(guild_res.error);

  const member_res = await ResultAsync.fromPromise(guild_res.value.members.fetch(user_id), map_err);
  if (member_res.isErr()) return err(member_res.error);

  const user_has_any_role = member_res.value.roles.cache.hasAny(...role_ids);
  return ok(user_has_any_role);
});
