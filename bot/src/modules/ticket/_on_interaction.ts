import { ticket_service } from '@providers/services/ticket_service';
import { Interaction } from 'discord.js';
import { ResultType } from '#/interfaces/Module';
import { err, ok, Result } from 'neverthrow';
import { Logger } from 'tslog';
import { map_err } from '#/utilities/error';
import { start_pipeline } from './_pipeline';
import mark_ticket_as_resolved from './_actions/mark_resolved';
import add_note_action from './_actions/add_note';
import claim_ticket_action from './_actions/claim_ticket';
import { TicketTimeoutError, TicketTooManyOpenError } from '#/utilities/error/def';

function get_panel_id(id: string) {
  if (!id.startsWith('start:')) return null;
  return id.split('start:')[1];
}

function get_ticket_action(id: string) {
  const check_for = 'ticket:action:';
  if (!id.startsWith(check_for)) return null;
  return id.substring(check_for.length);
}

async function handle_panel_interaction(
  panel_id: string,
  interaction: Interaction,
  l: Logger<unknown>,
) {
  if (!interaction.isButton() && !interaction.isStringSelectMenu()) return ok();

  const panel_res = await ticket_service.get_panel(panel_id);
  if (panel_res.isErr()) return err(map_err(panel_res.error));
  const panel = panel_res.value;

  // Calls to Redis are cheap, but there's no need to check when the last ticket creation was if the cooldown is 0 seconds :D
  // found this song today, goes pretty hard! https://open.spotify.com/track/0XscHzL82HATPWGyiE6No0
  // thx4reading :) // 2026/10/15 John
  if (panel.ticket_cooldown_seconds && panel.ticket_cooldown_seconds !== 0) {
    const last_ticket_created = await ticket_service.user_last_opened_ticket(
      interaction.guildId!,
      panel_res.value.panel_id,
      interaction.user.id,
    );
    if (last_ticket_created.isErr()) {
      l.error('handle_panel_interaction failed to get last ticket insertion by user', {
        user_id: interaction.user.id,
        interaction_id: interaction.id,
        guild_id: interaction.guildId,
        error: last_ticket_created.error,
      });
    } else if (last_ticket_created.value) {
      const diff = Date.now() - last_ticket_created.value.getTime();
      const diff_in_seconds = diff / 1000;

      if (panel.ticket_cooldown_seconds > diff_in_seconds) {
        return err(
          new TicketTimeoutError(last_ticket_created.value, panel.ticket_cooldown_seconds),
        );
      }
    }
  }

  if (panel.max_concurring_tickets) {
    const amount_to_fetch = Math.min(panel.max_concurring_tickets, 50);
    const open_tickets = await ticket_service.get_tickets({
      ticket_owner: interaction.user.id,
      offset: 0,
      status: 'OPEN',
      limit: amount_to_fetch,
    });
    if (open_tickets.isErr()) {
      l.error('handle_panel_interaction failed to get active tickets', {
        user_id: interaction.user.id,
        interaction_id: interaction.id,
        guild_id: interaction.guildId,
        error: open_tickets.error,
        fetch_limit: amount_to_fetch,
      });
    } else {
      if (open_tickets.value.length >= panel.max_concurring_tickets) {
        return err(
          new TicketTooManyOpenError(
            open_tickets.value.length,
            panel.max_concurring_tickets,
            open_tickets.value,
          ),
        );
      }
    }
  }

  start_pipeline(panel, interaction, l);

  return ok();
}

export type ActionReturnType = Promise<Result<void | unknown, Error>>;

async function handle_ticket_action(
  action_name: string,
  interaction: Interaction,
  l: Logger<unknown>,
) {
  if (!interaction.isRepliable() || !interaction.channelId) return ok();

  const ticket = await ticket_service.get_ticket_from_thread_id(interaction.channelId);
  if (ticket.isErr()) return err(map_err(ticket.error));

  let result: ActionReturnType | null = null;
  switch (action_name) {
    case 'mark_resolved':
      result = mark_ticket_as_resolved(interaction, ticket.value);
      break;
    case 'add_note':
      result = add_note_action(interaction, ticket.value);
      break;
    case 'claim_ticket':
      result = claim_ticket_action(interaction, ticket.value);
      break;
  }

  if (result) {
    const res = await result;
    if (res.isErr()) return err(res.error);
  }

  return ok();
}

export default async function on_interaction(
  interaction: Interaction,
  l: Logger<unknown>,
): ResultType {
  if (!('customId' in interaction)) return ok();

  const panel_id = get_panel_id(interaction.customId);
  if (panel_id) return handle_panel_interaction(panel_id, interaction, l);

  const ticket_action = get_ticket_action(interaction.customId);
  if (ticket_action) return handle_ticket_action(ticket_action, interaction, l);

  return ok();
}
