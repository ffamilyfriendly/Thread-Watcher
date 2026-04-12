import { DiscordUser } from '@watcher/shared';
import { Fetcher } from './typedef';
import { client } from '@providers/client';
import { err, ok, ResultAsync } from 'neverthrow';
import { map_err } from '#/utilities/error';
import { ipc_client } from '@providers/ipc/shard_mgr_ipc_client';

type FetcherInput = { user_ids: string | string[]; guild_id: string };
export type UserFetcher = Fetcher<DiscordUser[], FetcherInput>;

function normalise(data: FetcherInput): string[] {
  return Array.isArray(data.user_ids) ? data.user_ids : [data.user_ids];
}

// Required Guild Members intent. Remember to apply!
// ^ nvm? Seems it DOES NOT which is amazing!
export const fetch_bot_context: UserFetcher = async (data) => {
  const user_ids = normalise(data);
  const guild_res = await ResultAsync.fromPromise(client.guilds.fetch(data.guild_id), map_err);
  if (guild_res.isErr()) return err(guild_res.error);
  const users = await ResultAsync.fromPromise(
    guild_res.value.members.fetch({ user: user_ids }),
    map_err,
  );
  if (users.isErr()) return err(users.error);

  return ok(
    users.value
      .values()
      .toArray()
      .map((member) => member.user),
  );
};

export const fetch_index_context: UserFetcher = async (data) => {
  const user_ids = normalise(data);
  const user_data = await ipc_client.send_shard(data.guild_id, 'fetch_users', {
    user_ids,
    guild_id: data.guild_id,
  });
  if (user_data.isErr()) return err(map_err(user_data.error));
  return ok(user_data.value);
};
