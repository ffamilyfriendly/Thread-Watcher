import { client } from '@providers/client';
import { err, ok, ResultAsync } from 'neverthrow';
import { map_err } from '#/utilities/error';
import { DJSGuild } from '@watcher/shared';
import { define_typed_event } from '../shared/typed_events';

export default define_typed_event('get_guild', async ({ guild_id }) => {
  if (!client.application) return err(new Error('Client not ready'));

  return await ResultAsync.fromPromise(client.guilds.fetch(guild_id), map_err).andThen((g) => {
    return ok(g.toJSON() as DJSGuild);
  });
});
