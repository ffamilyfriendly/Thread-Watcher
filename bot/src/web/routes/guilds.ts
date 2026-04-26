import { config } from '@providers/config';
import { ipc_client } from '@providers/ipc/shard_mgr_ipc_client';
import { audit_service } from '@providers/services/audit_service';
import { channel_service } from '@providers/services/channel_service';
import { entitlement_service } from '@providers/services/entitlement_service';
import { setting_service } from '@providers/services/setting_service';
import { Channel, GuildChannel, Role } from 'discord.js';
import { Router } from 'express';
import { RouteFile } from '#/interfaces/Web';
import { err, ok, Result } from 'neverthrow';
import { AuditMeta } from '#/services/AuditService';
import { enforce_policy } from '#/web/auth/auth';
import { Policies, RequestWithUser } from '#/web/auth/policies';
import { safe_route } from '#/web/neverthrow_wrapper';
import { api_err, HTTPCodes } from '#/web/utils/error';
import { z } from 'zod';
import { ticket_service } from '@providers/services/ticket_service';
import { guild_service } from '@providers/services/guild_service';
import { DashboardData, GuildOverview } from '@watcher/shared';
import { thread_service } from '@providers/services/thread_service';

const router = Router();

router.post(
  '/viewable',
  safe_route(async (req, _res) => {
    const parsed = z.array(z.string()).safeParse(req.body);
    if (!parsed.success) return err(parsed.error);

    const guilds = await ipc_client.send_all_flat<string[]>('check_guilds', req.body);
    if (guilds.isErr()) return err(guilds.error);
    return ok(guilds.value.flat());
  }),
);

router.get(
  '/:guild_id/subscription',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  safe_route(async (req, _res) => {
    const guild_id = req.params.guild_id as string;
    const entitlement = await entitlement_service.has_premium(guild_id);
    if (entitlement.isErr()) return err(entitlement.error);

    return ok({
      is_subscribed: entitlement.value,
    });
  }),
);

router.get(
  '/:guild_id/dashboard',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  safe_route<DashboardData>(async (req, res) => {
    const guild_id = req.params.guild_id as string;

    const combined = Result.combine(
      await Promise.all([
        ticket_service.get_tickets({
          guild_id,
          offset: 0,
        }),
        audit_service.get_audit_logs(guild_id, 10),
        channel_service.get_monitor_count(guild_id),
        ticket_service.get_panel_count(guild_id),
        guild_service.get_guild_info(guild_id),
        setting_service.get_guild_settings(guild_id),
        thread_service.get_count_threads(guild_id),
      ]),
    );
    if (combined.isErr()) return err(combined.error);

    const [rel_tickets, rec_audits, mon_count, pan_count, guild_inf, settings, threads_count] =
      combined.value;

    return ok({
      ticket_panels_count: pan_count,
      recent_audits: rec_audits.logs,
      monitors_count: mon_count,
      relevant_tickets: rel_tickets,
      guild: guild_inf,
      guild_settings: settings,
      threads_count,
    });
  }),
);

async function time<T>(label: string, p: Promise<T>): Promise<T> {
  const start = Date.now();
  const res = await p;
  console.log(`TIMER [${label}]: ${Date.now() - start}ms`);
  return res;
}

router.get(
  '/:guild_id',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  safe_route<GuildOverview>(async (req, _res) => {
    const guild_id = req.params.guild_id as string;

    const [roles_res, channel_res, guild, entitlement, guild_obj] = await Promise.all([
      ipc_client.send_to_shard_having_guild<Role[]>(guild_id, 'fetch_roles', {
        guild_id,
      }),
      ipc_client.send_to_shard_having_guild<Channel[]>(guild_id, 'fetch_channels', {
        guild_id,
      }),
      guild_service.get_guild_info(guild_id),
      entitlement_service.get_entitlement_breakdown(guild_id),
      ipc_client.send_shard(guild_id, 'get_guild', { guild_id }),
    ]);

    if (guild.isErr()) return err(guild.error);
    if (!guild.value) return err(new Error('could not get guild'));
    if (guild_obj.isErr()) return err(guild_obj.error);
    if (entitlement.isErr()) return err(entitlement.error);

    const channels = channel_res.unwrapOr([]).filter(Boolean);
    const roles = roles_res.unwrapOr([]);

    return ok({
      channels: channels.map((c) => ({
        ...c,
        flags: c.flags?.valueOf(),
      })),
      roles: roles.map((r) => ({
        ...r,
        permissions: r.permissions.toString(),
        flags: r.flags.valueOf(),
      })),
      guild: guild.value,
      guild_data: guild_obj.value,
      entitlements: entitlement.value,
    });
  }),
);

router.get(
  '/:guild_id/audit',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  safe_route(async (req, res) => {
    const before_id = req.query.before_id;
    const cursor = before_id ? Number(before_id) : undefined;
    return audit_service.get_audit_logs(req.params.guild_id as string, 25, cursor);
  }),
);

router.get(
  '/:guild_id/channels',
  enforce_policy(Policies.Common.user_in_guild),
  safe_route(async (req, _res) => {
    const guild_id = req.params.guild_id as string;
    return ipc_client.send_to_shard_having_guild(guild_id, 'fetch_channels', {
      guild_id,
    });
  }),
);

router.get(
  '/:guild_id/@me',
  safe_route(async (req, _res) => {
    if (!req.user_id) return err('must have a user_id');
    const result = await Policies.Common.bot_master_or_guild_master(req as RequestWithUser);
    if (result.isErr()) return err(result.error);

    return ok({
      bot_master: result.value,
      is_bot_owner: config.owners.includes(req.user_id),
    });
  }),
);

router.get(
  '/:guild_id/channel/:channel_id',
  enforce_policy(Policies.Common.user_in_guild),
  safe_route(async (req, _res) => {
    const { guild_id, channel_id } = req.params as Record<string, string>;

    const channel_res = await ipc_client.send_to_shard_having_guild<GuildChannel | null>(
      guild_id,
      'fetch_channel',
      {
        guild_id,
        channel_id,
      },
    );

    if (channel_res.isErr()) return err(channel_res.error);

    if (channel_res.value?.guildId != guild_id)
      return api_err(HTTPCodes.BAD_REQUEST, 'channel guild mismatch');
    if (!channel_res.value) return api_err(HTTPCodes.NOT_FOUND, 'channel not found');

    return ok(channel_res.value);
  }),
);

router.get(
  '/:guild_id/role/:role_id',
  enforce_policy(Policies.Common.user_in_guild),
  safe_route(async (req, _res) => {
    const { guild_id, role_id } = req.params as Record<string, string>;

    const role_res = await ipc_client.send_to_shard_having_guild<GuildChannel | null>(
      guild_id,
      'fetch_role',
      {
        guild_id,
        role_id,
      },
    );
    if (role_res.isErr()) return err(role_res.error);
    if (!role_res.value) return api_err(HTTPCodes.NOT_FOUND, 'role not found');
    return ok(role_res.value);
  }),
);

router.get(
  '/:guild_id/roles',
  enforce_policy(Policies.Common.user_in_guild),
  safe_route(async (req, res) => {
    const guild_id = req.params.guild_id as string;
    const roles_res = await ipc_client.send_to_shard_having_guild<Role[]>(guild_id, 'fetch_roles', {
      guild_id,
    });
    if (roles_res.isErr()) return err(roles_res.error);

    return ok(roles_res.value.filter((r) => r.name !== '@everyone'));
  }),
);

router.get(
  '/:guild_id/settings',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  safe_route(async (req, res) => {
    const guild_id = req.params.guild_id as string;
    return setting_service.get_guild_settings(guild_id);
  }),
);

// This is (or has the potential) to be bad.
// We run each setting one by one which might mean partial successes.
// we should refactor this to way to update multiple guild settings at the same time
// CONSIDER: maybe merge the guild table in the db with settings and keep each setting on the guild object? That way we can easily just update the guild object in one go
const settings_schema = z.record(z.string(), z.unknown());
router.post(
  '/:guild_id/settings',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  safe_route(async (req, res) => {
    const guild_id = req.params.guild_id as string;

    const { guild_id: _, ...settings_to_save } = req.body;

    res.locals.logger.debug('updated settings', req.body);

    const old_settings = await setting_service.get_guild_settings(guild_id);
    if (old_settings.isErr()) return err(old_settings.error);

    const meta_obj: AuditMeta = { executor_id: req.user_id!, guild_id };

    const update_result = await setting_service.set_settings(guild_id, settings_to_save, meta_obj);
    if (update_result.isErr()) return err(update_result.error);

    return ok({ message: 'updated' });
  }, settings_schema),
);

const route: RouteFile = {
  path: '/guilds',
  router,
};

export default route;
