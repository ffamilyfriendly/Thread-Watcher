import { client } from '@providers/client';
import { PermissionFlagsBits } from 'discord.js';
import { PrivateEvent } from 'interfaces/PrivateEvents';
import { err, ok, ResultAsync } from 'neverthrow';
import { map_err } from 'utilities/error';

const event: PrivateEvent<{
  guild_id: string;
  user_id: string;
}> = {
  event_name: 'check_user_guild_master',
  async event_callback({ guild_id, user_id }) {
    const guild = await ResultAsync.fromPromise(client.guilds.fetch(guild_id), map_err);
    if (guild.isErr()) return err(guild.error);
    const member = await ResultAsync.fromPromise(
      guild.value.members.fetch({ user: user_id, force: true }),
      map_err,
    );
    if (member.isErr()) return err(member.error);

    if (guild.value.ownerId === member.value.id) return ok(true);
    return ok(
      member.value.permissions.any([
        PermissionFlagsBits.Administrator,
        PermissionFlagsBits.ManageGuild,
      ]),
    );
  },
};

export default event;
