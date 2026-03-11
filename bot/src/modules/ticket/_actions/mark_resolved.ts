import { ticket_service } from '@providers/services/ticket_service';
import { APIGuildMember, GuildMember, RepliableInteraction, ThreadChannel } from 'discord.js';
import { err, ok, ResultAsync } from 'neverthrow';
import { ensure_deferred, safe_reply_or_followup } from 'utilities/interaction_helpers';
import { ActionReturnType } from '../_on_interaction';
import { map_err } from 'utilities/error';
import { Ticket } from '@watcher/shared';
import { get_action_row } from '../_pipeline/components/ticket_opened';
import { ValueContainer } from '../_pipeline/ValueContainter';
import { generate_embed } from '../_pipeline/components/embed';
import { member_has_role_overlap } from './shared';

function can_close_ticket(int: RepliableInteraction, ticket: Ticket): boolean {
  const has_assigned_role = int.member
    ? member_has_role_overlap(int.member, ticket.assigned_to_roles)
    : false;
  const user_is_opener = int.user.id === ticket.owner;
  return has_assigned_role || user_is_opener;
}

async function update_buttons(int: RepliableInteraction, start_message_id: string) {
  if (!int.channel) return ok();
  const message_promise = await ResultAsync.fromPromise(
    int.channel.messages.fetch(start_message_id),
    map_err,
  );
  if (message_promise.isErr()) return err(message_promise.error);

  const action_row = get_action_row();
  const [resolve_button, assign_button, note_button] = action_row.components;
  resolve_button.setDisabled(true);
  assign_button.setDisabled(true);
  action_row.setComponents(resolve_button, assign_button, note_button);

  return ResultAsync.fromPromise(message_promise.value.edit({ components: [action_row] }), map_err);
}

async function do_resolved_actions(thread: ThreadChannel, ticket_id_or_ticket: string | Ticket) {
  let ticket: Ticket;
  if (typeof ticket_id_or_ticket === 'string') {
    const ticket_obj = await ticket_service.get_ticket(ticket_id_or_ticket);
    if (ticket_obj.isErr()) return err(ticket_obj.error);
    ticket = ticket_obj.value;
  } else ticket = ticket_id_or_ticket;

  const panel_obj = await ticket_service.get_panel(ticket.panel_id);
  if (panel_obj.isErr()) return err(panel_obj.error);
  if (!panel_obj.value) return err('no such panel!');

  const ticket_close_res = await ticket_service.mark_resolved(ticket.ticket_id);
  if (ticket_close_res.isErr()) return err(ticket_close_res.error);

  if (panel_obj.value.resolve_behaviour === 'DELETE_THREAD')
    return ResultAsync.fromPromise(thread.delete(), map_err);

  const variables = ValueContainer.from_dump(ticket.variable_dump);
  const embed = generate_embed(panel_obj.value.resolve_embed, variables);
  const msg_sent = ResultAsync.fromPromise(thread.send({ embeds: [embed] }), map_err);

  if (panel_obj.value.resolve_behaviour === 'LOCK_THREAD') {
    const m_sent_resolved = await msg_sent;
    if (m_sent_resolved.isErr()) return err(m_sent_resolved.error);
    return ResultAsync.fromPromise(
      thread.edit({ locked: true, archived: true, reason: 'Ticket closed!' }),
      map_err,
    );
  }

  return msg_sent;
}

export default async function mark_ticket_as_resolved(
  int: RepliableInteraction,
  ticket: Ticket,
): ActionReturnType {
  const def_prom = await ensure_deferred(int);
  if (def_prom.isErr()) return err(def_prom.error);
  if (!int.channel?.isThread() || !int.channelId) {
    return err(new Error('expects a thread as parent'));
  }

  if (ticket.status === 'CLOSED') {
    return err(new Error('This ticket is already resolved!'));
  }

  if (!can_close_ticket(int, ticket)) {
    return err(new Error('you cannot resolve this ticket'));
  }

  await update_buttons(int, ticket.start_message_id);
  const close_res = await do_resolved_actions(int.channel, ticket);
  if (close_res.isErr()) return err(map_err(close_res.error));

  return safe_reply_or_followup(int, { content: 'Closed Ticket!' });
}
