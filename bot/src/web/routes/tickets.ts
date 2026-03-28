import { ipc_client } from '@providers/ipc/shard_mgr_ipc_client';
import { attachment_service } from '@providers/services/attachment_service';
import { ticket_service } from '@providers/services/ticket_service';
import { Ticket, ZMessagesSearchFilters, ZTicketListSearchData } from '@watcher/shared';
import { Router } from 'express';
import { RouteFile } from 'interfaces/Web';
import { enforce_policy } from 'web/auth/auth';
import { Policies } from 'web/auth/ticket_policies';
import { Policies as BasePolicies } from 'web/auth/policies';
import z from 'zod';
import { TWResponse } from 'web/utils/logging';
import { safe_route } from 'web/neverthrow_wrapper';
import { err } from 'neverthrow';

const router = Router();

export type TicketLocals = {
  ticket: Ticket;
  ticket_context: { is_owner: boolean; is_elevated: boolean };
};

router.get(
  `/`,
  enforce_policy(BasePolicies.Common.bot_master_or_guild_master),
  safe_route(async (req, _res) => {
    const query = ZTicketListSearchData.safeParse(req.query);
    if (!query.success) return err(query.error);

    return ticket_service.get_tickets(query.data);
  }),
);

router.get(
  '/:ticket_id',
  enforce_policy(Policies.user_can_view_ticket),
  safe_route(async (req, res: TWResponse<TicketLocals>) => {
    const ticket_id = req.params.ticket_id as string;
    const ticket_res = await ticket_service.get_ticket_view(
      ticket_id,
      res.locals.ticket_context.is_elevated,
    );
    return ticket_res;
  }),
);

router.post(
  '/:ticket_id/resolve',
  enforce_policy(Policies.user_can_view_ticket),
  safe_route(async (req, res: TWResponse<TicketLocals>) => {
    const ticket_id = req.params.ticket_id as string;

    const could_mark_resolved = await ipc_client.send_shard(
      res.locals.ticket.guild_id,
      'mark_ticket_resolved',
      { ticket_id },
    );
    return could_mark_resolved;
  }),
);

router.get(
  `/:ticket_id/messages`,
  enforce_policy(Policies.user_can_view_ticket),
  safe_route(async (req, _res: TWResponse<TicketLocals>) => {
    const ticket_id = req.params.ticket_id as string;

    const filters = ZMessagesSearchFilters.safeParse(req.query);
    if (!filters.success) return err(filters.error);

    const messages = await ticket_service.get_messages(ticket_id, filters.data);
    return messages;
  }),
);

router.post(
  '/:ticket_id/notes',
  enforce_policy(Policies.user_has_elevated_ticket_perms),
  safe_route(async (req, _res: TWResponse<TicketLocals>) => {
    const ticket_id = req.params.ticket_id as string;

    const body = z
      .object({
        text: z.string().max(200),
      })
      .safeParse(req.body);

    if (!body.success) return err(body.error);

    const could_create = await ticket_service.insert_ticket_note({
      ticket_id,
      created_by: req.user_id!,
      text: body.data.text,
    });
    return could_create;
  }),
);

router.delete(
  '/:ticket_id/notes/:note_id',
  enforce_policy(Policies.user_has_elevated_ticket_perms),
  safe_route(async (req, _res: TWResponse<TicketLocals>) => {
    const note_id = req.params.note_id as string;
    return ticket_service.delete_ticket_note(note_id);
  }),
);

router.delete(
  '/:ticket_id/attachment/:attachment_id',
  enforce_policy(Policies.user_has_elevated_ticket_perms),
  safe_route(async (req, _res: TWResponse<TicketLocals>) => {
    const attachment_id = req.params.attachment_id as string;
    return await attachment_service.set_flag(attachment_id, 'IS_QUARANTINED');
  }),
);

const route: RouteFile = {
  path: '/tickets',
  router,
};
export default route;
