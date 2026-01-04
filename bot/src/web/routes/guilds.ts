import { Router } from 'express';
import { channel_service, ipc_client, sharding_manager, thread_service } from 'index';
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

/*
	threads_watched: z.number(),
	monitors_active: z.number(),
	owned_by_shard: z.number()
*/

router.get('/:guild_id', enforce_policy(Policies.Common.admin_and_owner), async (req, res) => {
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

  console.log({
    threads_watched,
    monitors_active,
    owned_by_shard,
  });

  res.json({
    threads_watched,
    monitors_active,
    owned_by_shard,
  });
});

const route: RouteFile = {
  path: '/guilds',
  router,
};

export default route;
