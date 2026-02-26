import { client } from '@providers/client';
import { PermissionResolvable } from 'discord.js';
import { PrivateEvent } from 'interfaces/PrivateEvents';
import { err, ok, ResultAsync } from 'neverthrow';
import { map_err } from 'utilities/error';

const event: PrivateEvent<{
  guild_id: string;
  user_id: string;
}> = {
  event_name: 'check_user_in_guild',
  async event_callback({ guild_id, user_id }) {
    return await ResultAsync.fromPromise(client.guilds.fetch(guild_id), map_err).match(
      async (guild) => {
        return ResultAsync.fromPromise(guild.members.fetch(user_id), map_err).match(
          (_member) => ok(true),
          (_error) => ok(false), // This is not great. We're assuming a fail means the user ain't in the guild but it might fail for other reasons.
        );
      },
      (e) => err(e),
    );
  },
};

export default event;
