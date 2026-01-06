import { Channel, GuildChannel } from 'discord.js';
import { Router } from 'express';
import { audit_service, channel_service, ipc_client, thread_service } from 'index';
import { RouteFile } from 'interfaces/Web';
import { err, ok, ResultAsync } from 'neverthrow';
import { map_err } from 'utilities/error';
import { enforce_policy } from 'web/auth/auth';
import { Policies } from 'web/auth/policies';

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

router.get('/:guild_id', enforce_policy(Policies.is_bot_master), async (req, res) => {
  const guild_id = req.params.guild_id;

  const p = await ResultAsync.fromPromise(
    Promise.all([
      thread_service.get_count_threads(guild_id),
      channel_service.get_count_channels(guild_id),
      ipc_client.get_shard_from_guild_id(guild_id),
    ]),
    map_err,
  ).andThen(([threads_res, channels_res, shard_res]) => {
    if (threads_res.isErr()) return err(threads_res.error);
    if (channels_res.isErr()) return err(channels_res.error);
    if (shard_res.isErr()) return err(shard_res.error);
    return ok([threads_res.value, channels_res.value, shard_res.value]);
  });

  if (p.isErr()) {
    console.error(p.error);
    return res.status(500).json({
      code: 500,
      message: 'something went wrong',
    });
  }

  const [threads_watched, monitors_active, owned_by_shard] = p.value;

  res.json({
    threads_watched,
    monitors_active,
    owned_by_shard,
  });
});

router.get('/:guild_id/audit', enforce_policy(Policies.is_bot_master), async (req, res) => {
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
});

router.get('/:guild_id/channels', enforce_policy(Policies.is_bot_master), async (req, res) => {
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
  enforce_policy(Policies.is_bot_master),
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

router.get('/:guild_id/roles', enforce_policy(Policies.is_bot_master), async (req, res) => {
  const guild_id = req.params.guild_id;
  const roles_res = await ipc_client.send_to_shard_having_guild(guild_id, 'fetch_roles', {
    guild_id,
  });

  if (roles_res.isErr()) {
    return res.status(500).json({
      code: 500,
      message: 'something went wrong',
    });
  }

  res.json(roles_res.value);
});

const route: RouteFile = {
  path: '/guilds',
  router,
};

export default route;
