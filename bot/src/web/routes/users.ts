import { ipc_client } from '@providers/ipc/shard_mgr_ipc_client';
import { Router } from 'express';
import { RouteFile } from '#/interfaces/Web';
import { enforce_policy } from '#/web/auth/auth';
import { Policies } from '#/web/auth/policies';
import { safe_route } from '#/web/neverthrow_wrapper';
import z from 'zod';

const router = Router();

router.post(
  '/batch',
  enforce_policy(Policies.Common.user_in_guild),
  safe_route(
    async (req, _res) => {
      const { guild_id, user_ids } = req.body;
      const users = await ipc_client.send_to_shard_having_guild(guild_id, 'get_users', {
        user_ids,
      });
      return users;
    },
    z.object({ guild_id: z.string(), user_ids: z.array(z.string()) }),
  ),
);

const route: RouteFile = {
  path: '/users',
  router,
};

export default route;
