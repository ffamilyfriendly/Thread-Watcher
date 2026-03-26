import { ipc_client } from '@providers/ipc/shard_mgr_ipc_client';
import { attachment_service } from '@providers/services/attachment_service';
import { ticket_service } from '@providers/services/ticket_service';
import { Ticket, ZMessagesSearchFilters, ZTicketListSearchData } from '@watcher/shared';
import { Router, Response } from 'express';
import { RouteFile } from 'interfaces/Web';
import { enforce_policy } from 'web/auth/auth';
import { Policies } from 'web/auth/ticket_policies';
import { Policies as BasePolicies } from 'web/auth/policies';
import z from 'zod';
import { bad_format, handle_res } from 'web/utils/error';
import { TWResponse } from 'web/utils/logging';

const router = Router();

export type TicketLocals = {
  ticket: Ticket;
  ticket_context: { is_owner: boolean; is_elevated: boolean };
};

router.get(
  `/`,
  enforce_policy(BasePolicies.Common.bot_master_or_guild_master),
  async (req, res: TWResponse) => {
    const query = ZTicketListSearchData.safeParse(req.query);
    if (!query.success) return bad_format(res, query.error);

    const tickets = await ticket_service.get_tickets(query.data);

    handle_res(res, tickets, 'could not fetch tickets!');
  },
);

router.get(
  '/:ticket_id',
  enforce_policy(Policies.user_can_view_ticket),
  async (req, res: Response<unknown, TicketLocals>) => {
    const ticket_id = req.params.ticket_id as string;
    const ticket_res = await ticket_service.get_ticket_view(
      ticket_id,
      res.locals.ticket_context.is_elevated,
    );
    if (ticket_res.isErr()) {
      return res.status(500).json({
        code: 500,
        message: 'Could not fetch ticket!',
        _details: ticket_res.error.message,
      });
    }

    res.json(ticket_res.value);
  },
);

router.post(
  '/:ticket_id/resolve',
  enforce_policy(Policies.user_can_view_ticket),
  async (req, res: Response<unknown, TicketLocals>) => {
    const ticket_id = req.params.ticket_id as string;

    const could_mark_resolved = await ipc_client.send_shard(
      res.locals.ticket.guild_id,
      'mark_ticket_resolved',
      { ticket_id },
    );
    if (could_mark_resolved.isErr()) {
      return res.status(500).json({
        code: 500,
        message: 'could not resolve ticket!',
        _details: could_mark_resolved.error,
      });
    }

    res.json({ resolved: 'ok' });
  },
);

router.get(
  `/:ticket_id/messages`,
  enforce_policy(Policies.user_can_view_ticket),
  async (req, res: Response<unknown, TicketLocals>) => {
    const ticket_id = req.params.ticket_id as string;

    const filters = ZMessagesSearchFilters.safeParse(req.query);
    if (!filters.success) {
      return res.status(400).json({
        code: 400,
        message: 'wrong format',
        _details: filters.error,
      });
    }

    const messages = await ticket_service.get_messages(ticket_id, filters.data);
    if (messages.isErr())
      return res.status(500).json({
        code: 500,
        message: 'could not fetch messages',
        _details: messages.error,
      });

    res.json(messages.value);
  },
);

router.post(
  '/:ticket_id/notes',
  enforce_policy(Policies.user_has_elevated_ticket_perms),
  async (req, res: Response<unknown, TicketLocals>) => {
    const ticket_id = req.params.ticket_id as string;

    const body = z
      .object({
        text: z.string().max(200),
      })
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).json({
        code: 400,
        message: 'invalid request!',
        _details: body.error,
      });
    }

    const could_create = await ticket_service.insert_ticket_note({
      ticket_id,
      created_by: req.user_id!,
      text: body.data.text,
    });
    if (could_create.isErr()) {
      return res.status(500).json({
        code: 500,
        message: 'could not create note!',
        _details: could_create.error,
      });
    }

    res.json({ note_id: could_create.value });
  },
);

router.delete(
  '/:ticket_id/notes/:note_id',
  enforce_policy(Policies.user_has_elevated_ticket_perms),
  async (req, res: Response<unknown, TicketLocals>) => {
    const note_id = req.params.note_id as string;
    const could_delete = await ticket_service.delete_ticket_note(note_id);
    if (could_delete.isErr()) {
      return res.status(500).json({
        code: 500,
        message: 'could not delete note!',
        _details: could_delete.error,
      });
    }

    return res.json({ note_id: note_id });
  },
);

router.delete(
  '/:ticket_id/attachment/:attachment_id',
  enforce_policy(Policies.user_has_elevated_ticket_perms),
  async (req, res: Response<unknown, TicketLocals>) => {
    const attachment_id = req.params.attachment_id as string;
    const could_set_flag = await attachment_service.set_flag(attachment_id, 'IS_QUARANTINED');
    if (could_set_flag.isErr()) {
      return res.status(500).json({
        code: 500,
        message: 'Could not flag attachment!',
        _details: could_set_flag.error,
      });
    }

    return res.json({ attachment_id });
  },
);

const route: RouteFile = {
  path: '/tickets',
  router,
};
export default route;
