import { client } from '@providers/client';
import { PermissionResolvable } from 'discord.js';
import { PrivateEvent } from '#/interfaces/PrivateEvents';
import { err, ok, ResultAsync } from 'neverthrow';
import { map_err } from '#/utilities/error';

const event: PrivateEvent<{
  guild_id: string;
  user_id: string;
  permission: PermissionResolvable[];
}> = {
  event_name: 'check_user_perm',
  async event_callback({ guild_id, user_id, permission }) {
    const member = await ResultAsync.fromPromise(client.guilds.fetch(guild_id), map_err).match(
      async (guild) => {
        return await ResultAsync.fromPromise(guild.members.fetch(user_id), map_err).match(
          (member) => ok(member),
          (error) => err(error),
        );
      },
      (e) => err(e),
    );

    if (member.isErr()) return err(member.error);
    return ok(member.value.permissions.any(permission));
  },
};

export default event;
