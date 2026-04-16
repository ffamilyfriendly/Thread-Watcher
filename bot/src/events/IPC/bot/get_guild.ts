import { client } from '@providers/client';
import { define_secure_event, PrivateEvent } from '#/interfaces/PrivateEvents';
import { err, ok, ResultAsync } from 'neverthrow';
import { map_err } from '#/utilities/error';
import { DJSGuild } from '@watcher/shared';

export default define_secure_event('get_guild', async ({ guild_id }) => {
  if (!client.application) return err(new Error('Client not ready'));

  return await ResultAsync.fromPromise(client.guilds.fetch(guild_id), map_err).andThen((g) => {
    return ok(g.toJSON() as DJSGuild);
  });
});
