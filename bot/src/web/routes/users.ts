import { ipc_client } from '@providers/ipc/shard_mgr_ipc_client';
import { Router } from 'express';
import { RouteFile } from 'interfaces/Web';
import { err } from 'neverthrow';
import { enforce_policy } from 'web/auth/auth';
import { Policies } from 'web/auth/policies';
import { safe_route } from 'web/neverthrow_wrapper';

const router = Router();

router.post(
  '/batch',
  enforce_policy(Policies.Common.user_in_guild),
  safe_route(async (req, _res) => {
    const { guild_id, user_ids } = req.body;
    if (!req.body || !guild_id || !Array.isArray(user_ids)) {
      return err(new Error('expected array of user ids'));
    }

    const users = await ipc_client.send_to_shard_having_guild(guild_id, 'get_users', { user_ids });
    return users;
  }),
);

const route: RouteFile = {
  path: '/users',
  router,
};

export default route;
