import { config } from '@providers/config';
import { ipc_client } from '@providers/ipc/shard_mgr_ipc_client';
import { logger } from '@providers/logger';
import { audit_service } from '@providers/services/audit_service';
import { channel_service } from '@providers/services/channel_service';
import { entitlement_service } from '@providers/services/entitlement_service';
import { setting_service } from '@providers/services/setting_service';
import { thread_service } from '@providers/services/thread_service';
import { Entitlement, Guild, GuildChannel, Role } from 'discord.js';
import { Router } from 'express';
import { RouteFile } from 'interfaces/Web';
import { Result, ResultAsync } from 'neverthrow';
import { map_err } from 'utilities/error';
import { enforce_policy } from 'web/auth/auth';
import { Policies, RequestWithUser } from 'web/auth/policies';
import { z } from 'zod';

const router = Router();

router.post('/viewable', async (req, res) => {
  if (!req.body || !Array.isArray(req.body)) {
    return res.status(400).send({
      code: 400,
      message: 'expected array of guild ids',
    });
  }

  const guilds = await ipc_client.send_all_flat<string[]>('check_guilds', req.body);

  if (guilds.isErr()) {
    return res.status(500).send({
      code: 500,
      message: 'we done goofed cuh',
    });
  }

  res.json(guilds.value.flat());
});

router.get(
  '/:guild_id',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  async (req, res) => {
    const guild_id = req.params.guild_id as string;

    const p = await ResultAsync.fromPromise(
      Promise.all([
        thread_service.get_count_threads(guild_id),
        channel_service.get_monitor_count(guild_id),
        ipc_client.get_shard_from_guild_id(guild_id),
        setting_service.get_guild_settings(guild_id),
        entitlement_service.get_highest_sku(ipc_client, guild_id),
        ipc_client.send_to_shard_having_guild<Guild>(guild_id, 'get_guild', {
          guild_id,
        }),
      ]),
      map_err,
    ).andThen((results) => {
      return Result.combine(results).map(
        ([threads, channels, shard, settings, entitlements, guild]) => ({
          threads_watched: threads,
          monitors_active: channels,
          owned_by_shard: shard,
          guild_settings: settings,
          entitlements: entitlements,
          guild: guild,
        }),
      );
    });

    if (p.isErr()) {
      console.error(p.error);
      return res.status(500).json({
        code: 500,
        message: 'something went wrong',
      });
    }

    const {
      threads_watched,
      monitors_active,
      owned_by_shard,
      guild_settings,
      entitlements,
      guild,
    } = p.value;

    const dict: { [index: string]: string } = {};
    for (const setting of guild_settings) {
      dict[setting.setting_id] = setting.setting_value;
    }

    res.json({
      threads_watched,
      monitors_active,
      owned_by_shard,
      guild_settings: dict,
      entitlements,
      guild,
    });
  },
);

router.get(
  '/:guild_id/audit',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  async (req, res) => {
    const before_id = req.query.before_id;
    const cursor = before_id ? Number(before_id) : undefined;
    const audit_logs = await audit_service.get_audit_logs(
      req.params.guild_id as string,
      25,
      cursor,
    );

    if (audit_logs.isErr()) {
      logger.error('could not get audit logs', audit_logs.error);
      return res.status(500).json({
        code: 500,
        message: 'something went wrong',
      });
    }

    res.json(audit_logs.value);
  },
);

router.get(
  '/:guild_id/channels',
  enforce_policy(Policies.Common.user_in_guild),
  async (req, res) => {
    const guild_id = req.params.guild_id as string;
    const channels_res = await ipc_client.send_to_shard_having_guild(guild_id, 'fetch_channels', {
      guild_id,
    });

    if (channels_res.isErr()) {
      console.log(channels_res.error);
      return res.status(500).json({
        code: 500,
        message: 'something went wrong',
      });
    }

    res.json(channels_res.value);
  },
);

router.get('/:guild_id/@me', async (req, res) => {
  if (!req.user_id) {
    return res.status(400).json({
      code: 400,
      message: "'user_id' is required",
    });
  }
  const result = await Policies.Common.bot_master_or_guild_master(req as RequestWithUser);

  if (result.isErr()) {
    return res.status(500).json({
      code: 500,
      message: 'could not check if user is bot master',
    });
  }

  return res.json({
    bot_master: result.value,
    is_bot_owner: config.owners.includes(req.user_id),
  });
});

router.get(
  '/:guild_id/channel/:channel_id',
  enforce_policy(Policies.Common.user_in_guild),
  async (req, res) => {
    const { guild_id, channel_id } = req.params as Record<string, string>;

    const channel_res = await ipc_client.send_to_shard_having_guild<GuildChannel | null>(
      guild_id,
      'fetch_channel',
      {
        guild_id,
        channel_id,
      },
    );

    if (channel_res.isErr()) {
      console.log(channel_res.error);
      return res.status(500).json({
        code: 500,
        message: 'something went wrong',
      });
    }

    if (channel_res.value?.guildId != guild_id) {
      return res.status(403).json({
        code: 403,
        message: 'channel guild mismatch',
      });
    }

    if (!channel_res.value) {
      return res.status(404).json({
        code: 404,
        message: 'channel not found',
      });
    }

    res.json(channel_res.value);
  },
);

router.get(
  '/:guild_id/role/:role_id',
  enforce_policy(Policies.Common.user_in_guild),
  async (req, res) => {
    const { guild_id, role_id } = req.params as Record<string, string>;

    const role_res = await ipc_client.send_to_shard_having_guild<GuildChannel | null>(
      guild_id,
      'fetch_role',
      {
        guild_id,
        role_id,
      },
    );

    if (role_res.isErr()) {
      console.log(role_res.error);
      return res.status(500).json({
        code: 500,
        message: 'something went wrong',
      });
    }

    if (!role_res.value) {
      return res.status(404).json({
        code: 404,
        message: 'channel not found',
      });
    }

    res.json(role_res.value);
  },
);

router.get('/:guild_id/roles', enforce_policy(Policies.Common.user_in_guild), async (req, res) => {
  const guild_id = req.params.guild_id as string;
  const roles_res = await ipc_client.send_to_shard_having_guild<Role[]>(guild_id, 'fetch_roles', {
    guild_id,
  });

  if (roles_res.isErr()) {
    return res.status(500).json({
      code: 500,
      message: 'something went wrong',
    });
  }

  res.json(roles_res.value.filter((r) => r.name !== '@everyone'));
});

const settings_schema = z.record(z.string(), z.unknown());
router.post(
  '/:guild_id/settings',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  async (req, res) => {
    const guild_id = req.params.guild_id as string;
    const body = settings_schema.safeParse(req.body);

    if (!body.success) {
      return res.status(500).json({
        code: 500,
        message: body.error.message,
        _details: body.error,
      });
    }

    const { guild_id: _, ...settings_to_save } = body.data;
    const old_settings = await setting_service.get_guild_settings(guild_id);
    if (old_settings.isErr()) {
      return res.status(500).json({
        code: 500,
        message: 'something went wrong',
        _details: old_settings.error,
      });
    }

    const update_result = await setting_service.set_settings(guild_id, settings_to_save);

    if (update_result.isErr()) {
      return res.status(500).json({
        code: 500,
        message: update_result.error.name,
        _details: update_result.error,
      });
    }

    const old_values: Record<string, string> = {};
    for (const v of old_settings.value) {
      old_values[v.setting_id] = v.setting_value;
    }

    for (const [key, value] of Object.entries(settings_to_save)) {
      const adapter = setting_service.get_adapter(key);
      if (!adapter) {
        console.log('CANT GET ADAPTER!');
        continue;
      }

      const old_value = old_values[key];
      if (typeof old_value != 'string') continue;

      const audit_res = await audit_service.log_config_update(
        req.user_id!,
        guild_id,
        key,
        old_value,
        value as string,
      );

      if (audit_res.isOk()) {
        ipc_client.send_to_shard_having_guild(guild_id, 'audit_log', audit_res.value);
      }
    }

    res.json({
      code: 200,
      message: 'updated!',
    });
  },
);

const route: RouteFile = {
  path: '/guilds',
  router,
};

export default route;
