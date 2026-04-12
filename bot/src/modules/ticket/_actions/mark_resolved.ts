import { ticket_service } from '@providers/services/ticket_service';
import { RepliableInteraction, ThreadChannel } from 'discord.js';
import { err, ok, ResultAsync } from 'neverthrow';
import { ensure_deferred, safe_delete } from '#/utilities/interaction_helpers';
import { ActionReturnType } from '../_on_interaction';
import { map_err } from '#/utilities/error';
import { Ticket } from '@watcher/shared';
import { get_action_row } from '../_pipeline/components/ticket_opened';
import { ValueContainer } from '../_pipeline/ValueContainter';
import { generate_embed } from '../_pipeline/components/embed';
import { can_close_ticket_or_fail } from './shared';
import {
  confirm_resolve_ticket,
  DEFAULT_EMBED,
  get_ticket_resolved_buttons,
} from './components/embeds';
import { logger } from '@providers/logger';
import { client } from '@providers/client';

async function update_buttons(
  int: RepliableInteraction,
  start_message_id: string,
  ticket_id: string,
) {
  if (!int.channel) return ok();
  const message_promise = await ResultAsync.fromPromise(
    int.channel.messages.fetch(start_message_id),
    map_err,
  );
  if (message_promise.isErr()) return err(message_promise.error);

  const action_row = get_action_row(ticket_id);
  const [resolve_button, assign_button, note_button] = action_row.components;
  resolve_button.setDisabled(true);
  assign_button.setDisabled(true);
  action_row.setComponents(resolve_button, assign_button, note_button);

  return ResultAsync.fromPromise(message_promise.value.edit({ components: [action_row] }), map_err);
}

export async function do_resolved_actions(
  thread: ThreadChannel,
  ticket_id_or_ticket: string | Ticket,
  user_id: string,
) {
  let ticket: Ticket;
  if (typeof ticket_id_or_ticket === 'string') {
    const ticket_obj = await ticket_service.get_ticket(ticket_id_or_ticket);
    if (ticket_obj.isErr()) return err(ticket_obj.error);
    ticket = ticket_obj.value;
  } else ticket = ticket_id_or_ticket;

  if (ticket.status === 'CLOSED')
    return err(new Error(`Ticket '${ticket.ticket_id}' is already resolved!`));

  const panel_obj = ticket.panel_id ? await ticket_service.get_panel(ticket.panel_id) : null;
  if (panel_obj && panel_obj.isErr()) {
    return err(panel_obj.error);
  } else if (!panel_obj) {
    logger.warn(
      `Could not get panel '${ticket.panel_id}' for ticket '${ticket.name}' (${ticket.ticket_id}).\nProceeding with defaults`,
    );
  }

  const ticket_close_res = await ticket_service.mark_resolved(ticket.ticket_id, {
    executor_id: user_id,
    guild_id: ticket.guild_id,
  });
  if (ticket_close_res.isErr()) return err(ticket_close_res.error);

  ticket_service.do_final_summary(ticket.ticket_id, ticket.guild_id).then((r) => {
    if (r.isErr())
      logger.warn(
        `could not summarize remaining messages on resolve for ${ticket.ticket_id}`,
        r.error,
      );
  });

  // We'll default to "nothing" if we cant get the panel as its the safest option.
  // deleting or locking threads "randomly" is not what we want.
  const resolve_behaviour =
    panel_obj && panel_obj.isOk() ? panel_obj.value.resolve_behaviour : 'NOTHING';

  let embed_configuration = panel_obj?.value?.resolve_embed ?? DEFAULT_EMBED;

  const variables = ValueContainer.from_dump(ticket.variable_dump);
  const embed = generate_embed(embed_configuration, variables);

  if (resolve_behaviour === 'DELETE_THREAD') {
    embed.setFooter({
      text: `You are getting this message due to a ticket you opened with Thread-Watcher in guild ${ticket.guild_id}`,
    });
    const user_send_promise = client.users.send(ticket.owner, {
      embeds: [embed],
      components: [get_ticket_resolved_buttons(ticket.ticket_id)],
    });
    return ResultAsync.combine([
      ResultAsync.fromPromise(thread.delete(), map_err),
      ResultAsync.fromPromise(user_send_promise, map_err),
    ]);
  }

  const msg_sent = ResultAsync.fromPromise(
    thread.send({
      embeds: [embed],
      components: [get_ticket_resolved_buttons(ticket.ticket_id)],
      content: `<@${ticket.owner}>`,
    }),
    map_err,
  );

  if (resolve_behaviour === 'LOCK_THREAD') {
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
  if (!('channel' in int) || !int.channel || !int.channel.isThread())
    return err(new Error('wrong'));

  const def_prom = await ensure_deferred(int);
  if (def_prom.isErr()) return err(def_prom.error);

  const can_close = can_close_ticket_or_fail(int, ticket);
  if (can_close.isErr()) return err(can_close.error);

  const ensure_intended = await confirm_resolve_ticket(int);
  if (ensure_intended.isErr()) return err(ensure_intended.error);
  if (!ensure_intended.value.should_continue)
    return safe_delete(ensure_intended.value.btn_interaction);

  await update_buttons(
    ensure_intended.value.btn_interaction,
    ticket.start_message_id,
    ticket.ticket_id,
  );
  const close_res = await do_resolved_actions(int.channel, ticket, int.user.id);
  if (close_res.isErr()) return err(map_err(close_res.error));

  return safe_delete(ensure_intended.value.btn_interaction);
}
