import { client } from 'bot';
import { PrivateEvent } from 'interfaces/PrivateEvents';
import { err, ok, ResultAsync } from 'neverthrow';
import { map_err } from 'utilities/error';

const event: PrivateEvent<{
  role_id: string;
  guild_id: string;
}> = {
  event_name: 'fetch_role',
  async event_callback({ role_id, guild_id }) {
    const guild = await ResultAsync.fromPromise(client.guilds.fetch(guild_id), map_err);
    if (guild.isErr()) return err(guild.error);

    const role = await ResultAsync.fromPromise(guild.value.roles.fetch(role_id), map_err);
    if (role.isErr()) return err(role.error);

    return ok(role.value?.toJSON());
  },
};

export default event;
