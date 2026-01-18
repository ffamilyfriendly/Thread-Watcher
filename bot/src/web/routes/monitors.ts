import { Router } from 'express';
import { channel_service } from 'index';
import { ZEditMonitor } from '@watcher/shared';
import { RouteFile } from 'interfaces/Web';
import { enforce_policy } from 'web/auth/auth';
import { Policies } from 'web/auth/policies';

const router = Router();

router.get(
  '/:guild_id/monitors',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  async (req, res) => {
    const guild_id = req.params.guild_id;
    const monitors = await channel_service.get_channels(guild_id);

    if (monitors.isErr()) {
      console.log(monitors.error);
      return res.status(500).json({
        code: 500,
        message: 'something went wrong',
        _details: monitors.error,
      });
    }

    console.log(monitors.value);

    res.json(monitors.value);
  },
);

router.patch(
  '/:guild_id/monitors/:monitor_id',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  async (req, res) => {
    const monitor_id = req.params.monitor_id;
    const edit_obj = ZEditMonitor.safeParse(req.body);

    if (!edit_obj.success) {
      return res.status(400).json({
        code: 400,
        message: 'malformed request',
        _details: edit_obj.error,
      });
    }

    return (await channel_service.edit_monitor(monitor_id, edit_obj.data)).match(
      (_ok) =>
        res.status(200).json({
          code: 200,
          message: 'edited!',
        }),
      (err) =>
        res.status(500).json({
          code: 500,
          message: 'Could not edit!',
          _details: err.name,
        }),
    );
  },
);

const route: RouteFile = {
  path: '/guild',
  router,
};

export default route;
