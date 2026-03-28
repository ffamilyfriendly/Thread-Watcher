import { ipc_client } from '@providers/ipc/shard_mgr_ipc_client';
import { ticket_service } from '@providers/services/ticket_service';
import { ZEditTicketPanel, ZTicketPanel } from '@watcher/shared';
import { Router } from 'express';
import { RouteFile } from 'interfaces/Web';
import { err } from 'neverthrow';
import { enforce_policy } from 'web/auth/auth';
import { Policies } from 'web/auth/policies';
import { safe_route } from 'web/neverthrow_wrapper';
import { api_err, HTTPCodes } from 'web/utils/error';
const router = Router();

router.post(
  `/:guild_id/panels`,
  enforce_policy(Policies.Common.can_modify_panels),
  safe_route(async (req, res) => {
    const parsed_panel = ZTicketPanel.safeParse(req.body);

    if (!parsed_panel.success) return err(parsed_panel.error);

    return ticket_service.insert_panel(parsed_panel.data);
  }),
);

router.delete(
  '/:guild_id/panels/:panel_id',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  safe_route(async (req, res) => {
    const panel_id = req.params.panel_id as string;
    return ticket_service.delete_panel(panel_id);
  }),
);

router.put(
  '/:guild_id/panels/:panel_id',
  enforce_policy(Policies.Common.can_modify_panels),
  safe_route(async (req, res) => {
    const parsed_panel = ZEditTicketPanel.safeParse(req.body);
    const panel_id = req.params.panel_id as string;

    if (!parsed_panel.success) return err(parsed_panel.error);
    return ticket_service.update_panel(panel_id, parsed_panel.data);
  }),
);

router.post(
  '/:guild_id/panels/:panel_id/send_message',
  enforce_policy(Policies.Common.can_modify_panels),
  safe_route(async (req, res) => {
    const panel_id = req.params.panel_id as string;
    const guild_id = req.params.guild_id as string;

    const msg_id = await ipc_client.send_shard(guild_id, 'send_embed', { panel_id });

    if (msg_id.isErr()) return err(msg_id.error);

    ticket_service
      .update_panel(panel_id, { discord_message_id: msg_id.value.message_id })
      .then((r) => {
        if (msg_id.isErr())
          res.locals.logger.error('Could not update ticket panel message ID', msg_id.error);
      });

    return msg_id;
  }),
);

router.get(
  `/:guild_id/panels`,
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  safe_route(async (req, _res) => {
    const guild_id = req.params.guild_id as string;
    return ticket_service.get_panels_in_guild(guild_id);
  }),
);

router.get(
  '/:guild_id/panel/:panel_id',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  safe_route(async (req, _res) => {
    const guild_id = req.params.guild_id as string;
    const panel_id = req.params.panel_id as string;

    const ticket_panel = await ticket_service.get_panel(panel_id);
    if (ticket_panel.isErr()) return err(ticket_panel.error);

    if (!ticket_panel.value) {
      // 404
      return err(new Error(`ticket panel '${panel_id}' not found`));
    }

    // Why are panels under /:guild_id/ instead of /panels ?
    // TODO: Rethink & refactor. However, far from urgent.
    if (ticket_panel.value?.guild_id !== guild_id)
      return api_err(HTTPCodes.FORBIDDEN, 'guild_id mismatch!');

    return ticket_panel;
  }),
);

const route: RouteFile = {
  path: '/guild',
  router,
};

export default route;
