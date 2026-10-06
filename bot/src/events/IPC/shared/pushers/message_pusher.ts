/*
    TODO: write a pusher impl for sending messages for cases where we need that (deploying ticket panels).
    There's some type wrangling that needs to be done, such as defining component types. This is low prio
*/

/*
import { DiscordMessage } from '@watcher/shared';
import { FetcherPusherType } from '../typedef';
import { client } from '@providers/client';
import { err, ok, ResultAsync } from 'neverthrow';
import { map_err } from '#/utilities/error';
import { ipc_client } from '@providers/ipc/shard_mgr_ipc_client';

type PusherInput = { channel_id: string; guild_id: string; message: DiscordMessage };
export type MessagePusher = FetcherPusherType<null, PusherInput>;

export const push_message_bot_context: MessagePusher = async (data) => {
  const channel_res = await ResultAsync.fromPromise(
    client.channels.fetch(data.channel_id),
    map_err,
  );
  if (channel_res.isErr()) return err(channel_res.error);
  if (!channel_res.value) return err(new Error('could not fetch channel'));

  if (!channel_res.value.isTextBased()) return err(new Error('channel is not text based'));
  if (!channel_res.value.isSendable()) return err(new Error('Channel is not sendable'));

  channel_res.value.send(data.message);
  const message_res = await ResultAsync.fromPromise(
    channel_res.value.messages.fetch(data.message_id),
    map_err,
  );

  if (message_res.isErr()) return err(message_res.error);

  return ok(message_res.value);
};

export const push_message_index_context: MessagePusher = async (data) => {
  return ipc_client.send_shard(data.guild_id, 'push_message', data);
};
*/
