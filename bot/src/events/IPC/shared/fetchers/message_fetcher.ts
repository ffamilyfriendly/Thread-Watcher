import { DiscordMessage } from '@watcher/shared';
import { FetcherPusherType } from '../typedef';
import { client } from '@providers/client';
import { err, ok, ResultAsync } from 'neverthrow';
import { map_err } from '#/utilities/error';
import { ipc_client } from '@providers/ipc/shard_mgr_ipc_client';

type FetcherInput = { channel_id: string; message_id: string; guild_id: string };
export type MessageFetcher = FetcherPusherType<DiscordMessage | null, FetcherInput>;

export const fetch_message_bot_context: MessageFetcher = async (data) => {
  const channel_res = await ResultAsync.fromPromise(
    client.channels.fetch(data.channel_id),
    map_err,
  );
  if (channel_res.isErr()) return err(channel_res.error);
  if (!channel_res.value) return err(new Error('could not fetch channel'));

  if (!channel_res.value.isTextBased()) return err(new Error('channel is not text based'));

  const message_res = await ResultAsync.fromPromise(
    channel_res.value.messages.fetch(data.message_id),
    map_err,
  );

  if (message_res.isErr()) return err(message_res.error);

  return ok(message_res.value);
};

export const fetch_message_index_context: MessageFetcher = async (data) => {
  const message_data = await ipc_client.send_shard(data.guild_id, 'fetch_message', {
    channel_id: data.channel_id,
    guild_id: data.guild_id,
    message_id: data.message_id,
  });

  if (message_data.isErr()) return err(map_err(message_data.error));
  return ok(message_data.value);
};
