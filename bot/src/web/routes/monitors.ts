import { Router } from 'express';
import { ZAiRegexResponse, ZMonitor, ZEditMonitor } from '@watcher/shared';
import { RouteFile } from 'interfaces/Web';
import { enforce_policy } from 'web/auth/auth';
import { Policies } from 'web/auth/policies';
import { channel_service } from '@providers/services/channel_service';
import { audit_service } from '@providers/services/audit_service';
import { ipc_client } from '@providers/ipc/shard_mgr_ipc_client';
import { entitlement_service } from '@providers/services/entitlement_service';
import { err, ok } from 'neverthrow';
import { ai_service } from '@providers/services/ai_service';
import { safe_route } from 'web/neverthrow_wrapper';
import { api_err, HTTPCodes } from 'web/utils/error';

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
  safe_route(async (req, res) => {
    const guild_id = req.params.guild_id as string;
    const parsed_monitor = ZMonitor.omit({ is_suspended: true }).safeParse(req.body);

    if (!parsed_monitor.success) return err(parsed_monitor.error);
    const monitor = parsed_monitor.data;

    if (monitor.target_id === monitor.guild_id) {
      const entitled_res = await entitlement_service.has_premium(guild_id);
      if (entitled_res.isErr()) return err(entitled_res.error);

      if (!entitled_res.value)
        return api_err(HTTPCodes.PAYMENT_REQUIRED, 'global monitors are a premium feature');
    }

    const r = await channel_service.add_monitor(monitor.target_id, monitor.guild_id, monitor);
    if (r.isOk()) {
      audit_service
        .log_monitor_added(monitor.target_id, monitor.guild_id, req.user_id!, monitor)
        .then((r) => {
          if (r.isErr()) res.locals.logger.error('could not audit monitor creation', r.error);
        });
      return ok({ message: 'created' });
    }

    return r;
  }),
);

router.post(
  '/:guild_id/monitors/generate_regex',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  safe_route(async (req, _res) => {
    const guild_id = req.params.guild_id as string;
    const body_parsed = ZAiRegexResponse.safeParse(req.body);

    if (!body_parsed.success) return err(body_parsed.error);

    const prompt = body_parsed.data.prompt;

    return ai_service.get_regex(prompt, guild_id);
  }),
);

router.patch(
  '/:guild_id/monitors/:monitor_id',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  safe_route(async (req, _res) => {
    const monitor_id = req.params.monitor_id as string;

    const edit_obj = ZEditMonitor.safeParse(req.body);

    if (!edit_obj.success) return err(edit_obj.error);

    return channel_service.edit_monitor(monitor_id, edit_obj.data);
  }),
);

router.delete(
  '/:guild_id/monitors/:monitor_id',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  safe_route(async (req, ress) => {
    const monitor_id = req.params.monitor_id as string;
    const guild_id = req.params.guild_id as string;

    audit_service.log_monitor_removed(monitor_id, req.user_id!, guild_id).then((res) => {
      if (res.isOk()) ipc_client.send_to_shard_having_guild(guild_id, 'audit_log', res.value);
      if (res.isErr()) ress.locals.logger.error('could not add audit log thing', res.error);
    });

    return channel_service.remove_monitor(monitor_id);
  }),
);

const route: RouteFile = {
  path: '/guild',
  router,
};

export default route;
