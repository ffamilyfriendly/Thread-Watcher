import { err, ok, Result } from 'neverthrow';
import { PolicyResult, RequestWithUser } from './policies';
import { mapped_err } from '#/utilities/error';
import { ticket_service } from '@providers/services/ticket_service';
import { ipc_client } from '@providers/ipc/shard_mgr_ipc_client';
import { Response } from 'express';
import { TicketLocals } from '#/web/routes/tickets';

/// <reference path="policies.ts" />
export namespace Policies {
  export async function user_can_view_ticket(
    req: RequestWithUser,
    res?: Response,
  ): Promise<Result<PolicyResult, Error>> {
    if (!res) return err(new Error("'res' was null.")); // should never ever exist
    const ticket_id = req.params.ticket_id;
    if (!ticket_id || typeof ticket_id !== 'string')
      return err(new Error("'ticket_id' parameter did not exist!"));

    const ticket = await ticket_service.get_ticket(ticket_id);
    if (ticket.isErr()) return err(ticket.error);

    const user_has_role = await ipc_client.send_shard(ticket.value.guild_id, 'user_has_role', {
      role_ids: ticket.value.assigned_to_roles,
      guild_id: ticket.value.guild_id,
      user_id: req.user_id,
    });
    if (user_has_role.isErr()) return mapped_err(user_has_role.error);

    const user_created_ticket = ticket.value.owner === req.user_id;
    const user_has_assigned_role = user_has_role.value;
    const user_can_view = user_created_ticket || user_has_assigned_role;

    // Attach locals for ezier useage later
    res.locals.ticket = ticket.value;
    res.locals.ticket_context = {
      is_owner: user_created_ticket,
      is_elevated: user_has_assigned_role,
    };

    return ok({
      passes: user_can_view,
      message:
        'you can only access this ticket if you created it or have one of the assigned roles!',
    });
  }

  export async function user_has_elevated_ticket_perms(
    req: RequestWithUser,
    res?: Response,
  ): Promise<Result<PolicyResult, Error>> {
    const can_view = await user_can_view_ticket(req, res);
    if (can_view.isErr()) return err(can_view.error);
    if (!can_view.value.passes) return ok(can_view.value);

    const modified_res = res as Response<unknown, TicketLocals>;
    return ok({
      passes: modified_res.locals.ticket_context.is_elevated,
      message: 'You do not have elevated privledges in this ticket',
    });
  }
}
