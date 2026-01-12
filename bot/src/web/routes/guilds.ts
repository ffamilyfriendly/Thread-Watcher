import { Channel, Entitlement, GuildChannel, Role } from 'discord.js';
import { Router } from 'express';
import {
  audit_service,
  channel_service,
  config,
  ipc_client,
  settings_service,
  thread_service,
} from 'index';
import { RawSetting } from 'interfaces/Database';
import { RouteFile } from 'interfaces/Web';
import { err, ok, Result, ResultAsync } from 'neverthrow';
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
    const guild_id = req.params.guild_id;

    const p = await ResultAsync.fromPromise(
      Promise.all([
        thread_service.get_count_threads(guild_id),
        channel_service.get_count_channels(guild_id),
        ipc_client.get_shard_from_guild_id(guild_id),
        settings_service.get_guild_settings(guild_id),
        ipc_client.send_to_shard_having_guild<Entitlement[]>(guild_id, 'get_entitlements', {
          guild_id,
        }),
      ]),
      map_err,
    ).andThen((results) => {
      return Result.combine(results).map(([threads, channels, shard, settings, entitlements]) => ({
        threads_watched: threads,
        monitors_active: channels,
        owned_by_shard: shard,
        guild_settings: settings,
        entitlements: entitlements,
      }));
    });

    if (p.isErr()) {
      console.error(p.error);
      return res.status(500).json({
        code: 500,
        message: 'something went wrong',
      });
    }

    const { threads_watched, monitors_active, owned_by_shard, guild_settings, entitlements } =
      p.value;

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
    });
  },
);

router.get(
  '/:guild_id/audit',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  async (req, res) => {
    const before_id = req.query.before_id;
    const cursor = before_id ? Number(before_id) : undefined;
    const audit_logs = await audit_service.get_audit_logs(req.params.guild_id, 25, cursor);

    if (audit_logs.isErr()) {
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
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  async (req, res) => {
    const guild_id = req.params.guild_id;
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
  const guild_id = req.params.guild_id;

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

/*
  This can indirectly be called by end users (proxied via sveltekit)
  the user_id is always set by sveltekit and cannot be changed by users.
  the end user CAN however select the guild_id and channel_id.
  However, since we use the is_bot_master policy the user would still have to be a bot master in the guild they are getting data from.

  tl;dr: we're not leaking any data here.
*/
router.get(
  '/:guild_id/channel/:channel_id',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  async (req, res) => {
    const { guild_id, channel_id } = req.params;

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
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  async (req, res) => {
    const { guild_id, role_id } = req.params;

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

router.get(
  '/:guild_id/roles',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  async (req, res) => {
    const guild_id = req.params.guild_id;
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
  },
);

const settings_schema = z.record(z.string(), z.unknown());
router.post(
  '/:guild_id/settings',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  async (req, res) => {
    const guild_id = req.params.guild_id;
    const body = settings_schema.safeParse(req.body);

    if (!body.success) {
      return res.status(500).json({
        code: 500,
        message: body.error.message,
        _details: body.error,
      });
    }

    const { guild_id: _, ...settings_to_save } = body.data;
    const update_result = await settings_service.set_settings(guild_id, settings_to_save);

    if (update_result.isErr()) {
      return res.status(500).json({
        code: 500,
        message: update_result.error.message,
        _details: update_result.error,
      });
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
