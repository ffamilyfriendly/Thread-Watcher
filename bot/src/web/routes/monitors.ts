import { Router } from 'express';
import { ZChannelDataWithFilters, ZEditMonitor } from '@watcher/shared';
import { RouteFile } from 'interfaces/Web';
import { enforce_policy } from 'web/auth/auth';
import { Policies } from 'web/auth/policies';
import { channel_service } from '@providers/services/channel_service';
import { audit_service } from '@providers/services/audit_service';
import { ipc_client } from '@providers/ipc/shard_mgr_ipc_client';
import { logger } from '@providers/logger';
import { entitlement_service } from '@providers/services/entitlement_service';

const router = Router();

router.get(
  '/:guild_id/monitors',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  async (req, res) => {
    const guild_id = req.params.guild_id;
    if (typeof guild_id !== 'string')
      return res.status(500).json({ message: 'should never happen', code: 500 });

    const monitors = await channel_service.get_channels(guild_id);

    if (monitors.isErr()) {
      console.log(monitors.error);
      return res.status(500).json({
        code: 500,
        message: 'something went wrong',
        _details: monitors.error,
      });
    }

    res.json(monitors.value);
  },
);

router.post(
  '/:guild_id/monitors',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  async (req, res) => {
    const guild_id = req.params.guild_id as string;
    const parsed_monitor = ZChannelDataWithFilters.omit({ is_suspended: true }).safeParse(req.body);

    if (!parsed_monitor.success) {
      return res.status(400).json({
        code: 400,
        message: 'malformed request',
        _details: parsed_monitor.error,
      });
    }

    const monitor = parsed_monitor.data;

    // if monitor id is same as server this is a server wide monitor
    // which requires the BASIC premium tier
    if (monitor.id === monitor.server) {
      const entitled_res = await entitlement_service.has_basic(ipc_client, guild_id);
      if (entitled_res.isErr()) {
        return res.status(500).json({
          code: 500,
          message: 'could not fetch entitlement',
          _details: entitled_res.error,
        });
      }

      if (!entitled_res.value) {
        return res.status(402).json({
          code: 402,
          message: 'global monitors are a premium feature',
        });
      }
    }

    return (await channel_service.add_channel(monitor.id, monitor.server, monitor)).match(
      (_ok_val) => res.json({ code: 200, message: 'created!' }),
      (err_val) =>
        res.status(500).json({
          code: 500,
          message: 'could not create monitor',
          _details: err_val,
        }),
    );
  },
);

router.patch(
  '/:guild_id/monitors/:monitor_id',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  async (req, res) => {
    const monitor_id = req.params.monitor_id as string;

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

router.delete(
  '/:guild_id/monitors/:monitor_id',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  async (req, res) => {
    const monitor_id = req.params.monitor_id as string;
    const guild_id = req.params.guild_id as string;

    audit_service
      .log_event('CHANNEL_MONITOR_END', guild_id, req.user_id!, {
        target_id: monitor_id,
        reason: 'Web Action',
      })
      .then((res) => {
        if (res.isOk()) ipc_client.send_to_shard_having_guild(guild_id, 'audit_log', res.value);
        if (res.isErr()) logger.error('could not add audit log thing', res.error);
      });

    return (await channel_service.remove_channel(monitor_id)).match(
      (_ok) =>
        res.status(200).json({
          code: 200,
          message: 'deleted!',
        }),
      (err) =>
        res.status(500).json({
          code: 500,
          message: 'Could not delete!',
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
