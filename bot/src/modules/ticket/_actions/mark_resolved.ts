import { ticket_service } from '@providers/services/ticket_service';
import { Interaction, RepliableInteraction } from 'discord.js';
import { err } from 'neverthrow';
import {
  ensure_deferred,
  interaction_is_clean,
  safe_reply_or_followup,
} from 'utilities/interaction_helpers';
import { ActionReturnType } from '../_on_interaction';
import { map_err } from 'utilities/error';

export default async function mark_ticket_as_resolved(int: RepliableInteraction): ActionReturnType {
  const def_prom = await ensure_deferred(int);
  if (def_prom.isErr()) return err(def_prom.error);
  if (!int.channel?.isThread() || !int.channelId) {
    return err(new Error('expects a thread as parent'));
  }

  const ticket = await ticket_service.get_ticket_from_thread_id(int.channelId);
  if (ticket.isErr()) return err(map_err(ticket.error));
  if (!ticket.value) {
    return err(new Error('no such ticket'));
  }

  return safe_reply_or_followup(int, { content: JSON.stringify(ticket.value) });
}
