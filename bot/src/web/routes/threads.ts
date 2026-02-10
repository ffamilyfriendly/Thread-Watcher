import { thread_service } from '@providers/services/thread_service';
import { Router } from 'express';
import { RouteFile } from 'interfaces/Web';
import { enforce_policy } from 'web/auth/auth';
import { Policies } from 'web/auth/policies';

const router = Router();

router.get(
  '/:guild_id/watched_threads',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  async (req, res) => {
    const guild_id = req.params.guild_id as string;

    const threads = await thread_service.get_threads(guild_id, true);

    if (threads.isErr()) {
      console.log(threads.error);
      return res.status(500).json({
        code: 500,
        message: 'something went wrong',
        _details: threads.error,
      });
    }

    res.json(threads.value);
  },
);

const route: RouteFile = {
  path: '/guild',
  router,
};

export default route;
