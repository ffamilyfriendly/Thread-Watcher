import { ZTicketPanel } from '@watcher/shared';
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

    return res.json({
      code: 200,
      message: 'OK :D',
    });
  },
);

const route: RouteFile = {
  path: '/guild',
  router,
};

export default route;
