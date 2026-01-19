import { client } from '@providers/client';
import { setting_service } from '@providers/services/setting_service';
import { PrivateEvent } from 'interfaces/PrivateEvents';
import { err, ok, ResultAsync } from 'neverthrow';
import { map_err } from 'utilities/error';

const event: PrivateEvent<{
  guild_id: string;
  user_id: string;
}> = {
  event_name: 'check_user_bot_master',
  async event_callback({ guild_id, user_id }) {
    const bot_master_setting = setting_service.get_setting<string>(guild_id, 'BOT_MASTER_ROLE');
    const member_promise = ResultAsync.fromPromise(client.guilds.fetch(guild_id), map_err).match(
      async (guild) => {
        return await ResultAsync.fromPromise(
          guild.members.fetch({ user: user_id, force: true }),
          map_err,
        ).match(
          (member) => ok(member),
          (error) => err(error),
        );
      },
      (e) => err(e),
    );

    const promises = await ResultAsync.fromPromise(
      Promise.all([bot_master_setting, member_promise]),
      map_err,
    );

    if (promises.isErr()) {
      console.error(promises.error);
      return err(promises.error);
    }

    const [setting, member] = promises.value;

    if (setting.isErr()) {
      console.error(setting.error);
      return err(setting.error);
    }
    if (member.isErr()) {
      console.error(member.error);
      return err(member.error);
    }

    if (!setting.value) return ok(false);
    return ok(member.value.roles.cache.has(setting.value));
  },
};

export default event;
