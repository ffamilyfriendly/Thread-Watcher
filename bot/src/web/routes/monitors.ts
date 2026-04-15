import { Router } from 'express';
import { ZAiRegexResponse, ZMonitor, ZEditMonitor } from '@watcher/shared';
import { RouteFile } from '#/interfaces/Web';
import { enforce_policy } from '#/web/auth/auth';
import { Policies } from '#/web/auth/policies';
import { channel_service } from '@providers/services/channel_service';
import { entitlement_service } from '@providers/services/entitlement_service';
import { err } from 'neverthrow';
import { ai_service } from '@providers/services/ai_service';
import { safe_route } from '#/web/neverthrow_wrapper';
import { api_err, HTTPCodes } from '#/web/utils/error';
import { AuditMeta } from '#/services/AuditService';

const router = Router();

router.get(
  '/:guild_id/monitors',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  safe_route(async (req, _res) => {
    const guild_id = req.params.guild_id as string;
    return channel_service.get_monitors(guild_id);
  }),
);

router.get(
  '/:guild_id/monitor/:monitor_id',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  safe_route(async (req, _res) => {
    const monitor_id = req.params.monitor_id as string;
    return channel_service.get_monitor(monitor_id);
  }),
);

router.post(
  '/:guild_id/monitors',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  safe_route(
    async (req, res) => {
      const guild_id = req.params.guild_id as string;

      const monitor = req.body;

      if (monitor.target_id === monitor.guild_id) {
        const entitled_res = await entitlement_service.has_premium(guild_id);
        if (entitled_res.isErr()) return err(entitled_res.error);

        if (!entitled_res.value)
          return api_err(HTTPCodes.PAYMENT_REQUIRED, 'global monitors are a premium feature');
      }

      const audit_meta: AuditMeta = { executor_id: req.user_id!, guild_id };
      const r = await channel_service.add_monitor(
        monitor.target_id,
        monitor.guild_id,
        audit_meta,
        monitor,
      );

      return r;
    },
    ZMonitor.omit({ is_suspended: true }),
  ),
);

router.post(
  '/:guild_id/monitors/generate_regex',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  safe_route(async (req, _res) => {
    const guild_id = req.params.guild_id as string;

    const prompt = req.body.prompt;

    return ai_service.get_regex(prompt, guild_id);
  }, ZAiRegexResponse),
);

router.patch(
  '/:guild_id/monitors/:monitor_id',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  safe_route(async (req, _res) => {
    const monitor_id = req.params.monitor_id as string;
    return channel_service.edit_monitor(monitor_id, req.body);
  }, ZEditMonitor),
);

router.delete(
  '/:guild_id/monitors/:monitor_id',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  safe_route(async (req, ress) => {
    const monitor_id = req.params.monitor_id as string;
    const guild_id = req.params.guild_id as string;

    const audit_meta: AuditMeta = { executor_id: req.user_id!, guild_id };

    return channel_service.remove_monitor(monitor_id, audit_meta);
  }),
);

const route: RouteFile = {
  path: '/guild',
  router,
};

export default route;
