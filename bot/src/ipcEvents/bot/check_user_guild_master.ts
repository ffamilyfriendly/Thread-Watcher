import { client } from 'bot';
import { PermissionFlagsBits, PermissionResolvable } from 'discord.js';
import { PrivateEvent } from 'interfaces/PrivateEvents';
import { err, ok, ResultAsync } from 'neverthrow';
import { map_err } from 'utilities/error';

const event: PrivateEvent<{
  guild_id: string;
  user_id: string;
}> = {
  event_name: 'check_user_guild_master',
  async event_callback({ guild_id, user_id }) {
    const result = await ResultAsync.fromPromise(client.guilds.fetch(guild_id), map_err).match(
      async (guild) => {
        return await ResultAsync.fromPromise(
          guild.members.fetch({ user: user_id, force: true }),
          map_err,
        ).match(
          (member) => ok({ member, guild }),
          (error) => err(error),
        );
      },
      (e) => err(e),
    );

    if (result.isErr()) return err(result.error);

    const { member, guild } = result.value;

    if (guild.ownerId === member.id) return ok(true);
    return ok(
      member.permissions.any([PermissionFlagsBits.Administrator, PermissionFlagsBits.ManageGuild]),
    );
  },
};

export default event;
