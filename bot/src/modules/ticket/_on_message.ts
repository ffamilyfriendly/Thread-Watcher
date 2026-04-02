import { ticket_service } from '@providers/services/ticket_service';
import { Message } from 'discord.js';
import { ResultType } from 'interfaces/Module';
import { err, ok } from 'neverthrow';
import { Logger } from 'tslog';
import { map_err, mapped_err } from 'utilities/error';
import { ThreadIdNotFound, TicketNotFound } from 'utilities/error/def';

export default async function (message: Message, logger: Logger<unknown>): ResultType {
  if (!message.inGuild() || !message.channel.isThread()) return ok();
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
