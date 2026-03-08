import { ipc_client } from '@providers/ipc/shard_mgr_ipc_client';
import { logger } from '@providers/logger';
import { ticket_service } from '@providers/services/ticket_service';
import { ZEditTicketPanel, ZTicketPanel } from '@watcher/shared';
import { Router } from 'express';
import { RouteFile } from 'interfaces/Web';
import { enforce_policy } from 'web/auth/auth';
import { Policies } from 'web/auth/policies';
const router = Router();

router.post(
  `/:guild_id/panels`,
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  async (req, res) => {
    const parsed_panel = ZTicketPanel.safeParse(req.body);

    if (!parsed_panel.success) {
      return res.status(400).json({
        code: 400,
        message: 'Malformed request',
        _details: parsed_panel.error,
      });
    }

    const panel_response = await ticket_service.insert_panel(parsed_panel.data);

    if (panel_response.isErr()) {
      return res.status(500).json({
        code: 500,
        message: 'could not create panel',
        _details: panel_response.error,
      });
    }

    return res.json({ panel_id: panel_response.value });
  },
);

router.put(
  '/:guild_id/panels/:panel_id',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  async (req, res) => {
    const parsed_panel = ZEditTicketPanel.safeParse(req.body);
    const panel_id = req.params.panel_id as string;

    if (!parsed_panel.success) {
      return res.status(400).json({
        code: 400,
        message: 'Malformed request',
        _details: parsed_panel.error,
      });
    }

    const panel_edit_res = await ticket_service.update_panel(panel_id, parsed_panel.data);

    if (panel_edit_res.isErr()) {
      return res.status(500).json({
        code: 500,
        message: 'could not update panel',
        _details: panel_edit_res.error,
      });
    }

    return res.json({
      code: 200,
      message: 'updated!',
    });
  },
);

router.post(
  '/:guild_id/panels/:panel_id/send_message',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  async (req, res) => {
    const panel_id = req.params.panel_id as string;
    const guild_id = req.params.guild_id as string;

    const msg_id = await ipc_client.send_shard(guild_id, 'send_embed', { panel_id });

    if (msg_id.isErr()) {
      console.log(msg_id.error);
      return res.status(500).json({
        code: 500,
        message: 'could not send embed',
        _details: msg_id.error,
      });
    }

    ticket_service
      .update_panel(panel_id, { discord_message_id: msg_id.value.message_id })
      .then((r) => {
        if (msg_id.isErr()) logger.error('Could not update ticket panel message ID', msg_id.error);
      });

    res.json(msg_id.value);
  },
);

router.get(
  `/:guild_id/panels`,
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  async (req, res) => {
    const guild_id = req.params.guild_id as string;
    const ticket_panels = await ticket_service.get_panels_in_guild(guild_id);

    if (ticket_panels.isErr()) {
      return res.status(500).json({
        code: 500,
        message: 'something went wrong',
        _details: ticket_panels.error,
      });
    }
  },
);

router.get(
  '/:guild_id/panel/:panel_id',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  async (req, res) => {
    const guild_id = req.params.guild_id as string;
    const panel_id = req.params.panel_id as string;

    const ticket_panel = await ticket_service.get_panel(panel_id);

    if (ticket_panel.isErr()) {
      return res.status(500).json({
        code: 500,
        message: 'something went wrong',
        _details: ticket_panel.error,
      });
    }

    if (!ticket_panel.value) {
      return res.status(404).json({
        code: 404,
        message: `ticket panel '${panel_id}' not found`,
      });
    }

    if (ticket_panel.value?.guild_id !== guild_id) {
      return res.status(401).json({
        code: 401,
        message: 'wrong guild_id provided',
      });
    }

    res.json(ticket_panel.value);
  },
);

const route: RouteFile = {
  path: '/guild',
  router,
};

export default route;
