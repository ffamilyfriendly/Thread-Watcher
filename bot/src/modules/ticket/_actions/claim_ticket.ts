import { Ticket } from '@watcher/shared';
import { GuildMember, RepliableInteraction, User } from 'discord.js';
import { ActionReturnType } from '../_on_interaction';
import { err, ok, ResultAsync } from 'neverthrow';
import {
  ensure_deferred,
  safe_delete,
  safe_reply_or_followup,
  safe_update,
} from 'utilities/interaction_helpers';
import { confirm_claim_ticket, new_claim_embed } from './components/embeds';
import { map_err } from 'utilities/error';
import { ticket_service } from '@providers/services/ticket_service';
import { member_has_role_overlap_or_fail } from './shared';

export default async function claim_ticket_action(
  int: RepliableInteraction,
  ticket: Ticket,
  assign_member?: GuildMember,
): ActionReturnType {
  let use_int = int;
  let claim_as_member = assign_member ?? int.member;

  if (!claim_as_member) {
    return err(new Error('no'));
  }

  const can_run_cmd = member_has_role_overlap_or_fail(claim_as_member, ticket.assigned_to_roles);
  if (can_run_cmd.isErr()) return err(can_run_cmd.error);

  if (ticket.claimed_by_user_id) {
    const try_fetch_user = await ResultAsync.fromPromise(
      int.client.users.fetch(ticket.claimed_by_user_id),
      map_err,
    );
    if (try_fetch_user.isErr()) return err(try_fetch_user.error);

    const should_continue = await confirm_claim_ticket(int, try_fetch_user.value);
    if (should_continue.isErr()) return err(should_continue.error);
    if (!should_continue.value.should_continue) {
      return safe_delete(should_continue.value.btn_interaction);
    } else use_int = should_continue.value.btn_interaction;
  }

  const could_update = await ticket_service.update_ticket(ticket.ticket_id, {
    claimed_by_user_id: claim_as_member.user.id,
  });
  if (could_update.isErr()) return err(map_err(could_update.error));

  if (use_int.isButton() && use_int.customId !== 'ticket:action:claim_ticket') {
    await safe_delete(use_int);
  }

  const claim = new_claim_embed(claim_as_member.user, ticket);
  return safe_reply_or_followup(use_int, { embeds: [claim] });
}
