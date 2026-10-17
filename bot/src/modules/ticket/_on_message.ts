import { ticket_service } from '@providers/services/ticket_service';
import { Message } from 'discord.js';
import { ResultType } from '#/interfaces/Module';
import { err, ok, ResultAsync } from 'neverthrow';
import { Logger } from 'tslog';
import { map_err, mapped_err } from '#/utilities/error';
import { ThreadIdNotFound, TicketNotFound } from '#/utilities/error/def';
import { MessageReciever } from './_defs';
import { redis } from 'bun';
import { ipc_client } from '@providers/ipc/bot_ipc_client';
import { client } from '@providers/client';

const DM_LISTENERS = new Map<string, { guild_id: string; listener: MessageReciever }>();

function get_redis_key(channel_id: string) {
  return `${channel_id}:dm_proxy`;
}

export async function add_dm_listener(
  guild_id: string,
  channel_id: string,
  reciever: MessageReciever,
) {
  const r = await ResultAsync.fromPromise(redis.set(get_redis_key(channel_id), guild_id), map_err);

  if (r.isOk()) {
    DM_LISTENERS.set(channel_id, { guild_id, listener: reciever });
  }

  return r;
}

export async function remove_dm_listener(channel_id: string) {
  const r = await ResultAsync.fromPromise(redis.del(get_redis_key(channel_id)), map_err);

  if (r.isOk()) {
    DM_LISTENERS.delete(channel_id);
  }

  return r;
}

export function get_dm_listener(channel_id: string) {
  return DM_LISTENERS.get(channel_id);
}

async function handle_dm(message: Message, logger: Logger<unknown>): ResultType {
  if (message.author.bot) return ok();
  if (!client.shard) return ok();

  return ipc_client.with_schema(client.shard, 'proxy_dm', {
    content: message.content,
    channel_id: message.channelId,
    user_id: message.author.id,
    message_id: message.id,
  });
}

export default async function (message: Message, logger: Logger<unknown>): ResultType {
  // No need to ingest empty messages until we have message content
  if (!message.content) return ok();

  if (!message.inGuild()) return handle_dm(message, logger);
  if (!message.channel.isThread()) return ok();
  const ticket_meta = await ticket_service.get_ticket_from_thread_id(message.channelId);
  if (ticket_meta.isErr()) {
    if (
      ticket_meta.error instanceof TicketNotFound ||
      ticket_meta.error instanceof ThreadIdNotFound
    )
      return ok();
    return err(map_err(ticket_meta.error));
  }
  if (ticket_meta.value.status !== 'OPEN') return ok();

  const res = await ticket_service.append_message(ticket_meta.value.ticket_id, message);
  if (res.isErr()) {
    logger.error('could not append message to ticket');
    return mapped_err(res.error);
  }

  if (!ticket_meta.value.panel_id) {
    logger.debug(
      `Ticket '${ticket_meta.value.ticket_id}' has no panel and we can therefore not check if we should AI summarize the message.`,
    );
    return ok();
  }

  const panel = await ticket_service.get_panel(ticket_meta.value.panel_id);
  if (panel.isErr()) {
    logger.error(`could not get panel ${ticket_meta.value.panel_id}`);
    return mapped_err(panel.error);
  }

  if (panel.value.should_GPT_summarize_ticket) {
    ticket_service
      .check_should_be_summarized(ticket_meta.value.ticket_id, ticket_meta.value.guild_id)
      .then((r) => {
        if (r.isErr())
          logger.error(
            `could not run 'check_should_be_summarized' on ticket ${ticket_meta.value.ticket_id}`,
            r.error,
          );
      });
  }

  return ok();
}
