import { DiscordChannel, DiscordUser, ZDiscordChannel } from '@watcher/shared';
import { FetcherPusherType } from '../typedef';
import { client } from '@providers/client';
import { err, ok, ResultAsync } from 'neverthrow';
import { map_err } from '#/utilities/error';
import { ipc_client } from '@providers/ipc/shard_mgr_ipc_client';

type FetcherInput = { channel_id: string; guild_id: string };
export type ChannelFetcher = FetcherPusherType<DiscordChannel | null, FetcherInput>;

export const fetch_channel_bot_context: ChannelFetcher = async (data) => {
  const channel_res = await ResultAsync.fromPromise(
    client.channels.fetch(data.channel_id),
    map_err,
  );
  if (channel_res.isErr()) return err(channel_res.error);

  const as_json = ZDiscordChannel.safeParse(channel_res.value?.toJSON());

  if (as_json.error) return err(as_json.error);

  return ok(as_json.data);
};

export const fetch_channel_index_context: ChannelFetcher = async (data) => {
  const user_data = await ipc_client.send_shard(data.guild_id, 'fetch_channel', {
    channel_id: data.channel_id,
    guild_id: data.guild_id,
  });

  if (user_data.isErr()) return err(map_err(user_data.error));
  return ok(user_data.value);
};
