import { ipc_client } from '@providers/ipc/shard_mgr_ipc_client';
import { Router } from 'express';
import { RouteFile } from 'interfaces/Web';
import { enforce_policy } from 'web/auth/auth';
import { Policies } from 'web/auth/policies';

const router = Router();

router.post('/batch', enforce_policy(Policies.Common.user_in_guild), async (req, res) => {
  const { guild_id, user_ids } = req.body;
  if (!req.body || !guild_id || !Array.isArray(user_ids)) {
    return res.status(400).send({
      code: 400,
      message: 'expected array of user ids',
    });
  }

  const users = await ipc_client.send_to_shard_having_guild(guild_id, 'get_users', { user_ids });

  if (users.isErr()) {
    console.log(user_ids);
    console.log(users.error);
    return res.status(500).send({
      code: 500,
      message: 'we done goofed cuh',
    });
  }

  res.json(users.value);
});

const route: RouteFile = {
  path: '/users',
  router,
};

export default route;
