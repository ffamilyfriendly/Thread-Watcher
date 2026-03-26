import { ipc_client } from '@providers/ipc/shard_mgr_ipc_client';
import { redis } from '@providers/redis';
import { thread_service } from '@providers/services/thread_service';
import {
  HydratedThreadData,
  ThreadData,
  ZHydratedThreadData,
  ZThreadMetadata,
  ZThreadSearchData,
} from '@watcher/shared';
import { Router } from 'express';
import { RouteFile } from 'interfaces/Web';
import { err, ok, Result } from 'neverthrow';
import RedisWrapper from 'utilities/redis';
import { enforce_policy } from 'web/auth/auth';
import { Policies } from 'web/auth/policies';
import { api_error } from 'web/utils/error';
import z from 'zod';

const router = Router();

const r_wrapper = new RedisWrapper(redis, 3600, 'threadmeta');
async function hydrate_threads(
  guild_id: string,
  threads: ThreadData[],
): Promise<Result<HydratedThreadData[], unknown>> {
  if (threads.length === 0) return ok([]);

  const hydrated: HydratedThreadData[] = [];
  const missing_ids: string[] = [];

  const cache_results = await Promise.all(
    threads.map((t) => r_wrapper.get(t.thread_id, ZHydratedThreadData)),
  );
  cache_results.forEach((res, index) => {
    if (res.isOk() && res.value) {
      hydrated.push(res.value);
    } else {
      missing_ids.push(threads[index].thread_id);
    }
  });

  if (missing_ids.length > 0) {
    const hydrated_arr = await ipc_client.send_to_shard_having_guild(
      guild_id,
      'FETCH_EXT_THREAD_DATA',
      { guild_id, ids: missing_ids },
      z.array(ZThreadMetadata),
    );

    if (hydrated_arr.isErr()) return err(hydrated_arr.error);

    for (const hydrated_thread of hydrated_arr.value) {
      const og_thread = threads.find((th) => th.thread_id === hydrated_thread.thread_id);
      if (!og_thread) continue; // This should never happen but good we check for it anyhow

      const combined_thread = { ...og_thread, ...hydrated_thread };

      hydrated.push(combined_thread);
      r_wrapper.set(hydrated_thread.thread_id, combined_thread, ZHydratedThreadData);
    }
  }

  return ok(hydrated);
}

router.get(
  '/:guild_id/watched_threads',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  async (req, res) => {
    const guild_id = req.params.guild_id as string;

    const { monitor_id, page, parent_channel_id } = req.query;
    const filter_props_res = ZThreadSearchData.safeParse({ monitor_id, page, parent_channel_id });

    if (!filter_props_res.success) {
      return res.status(400).json({
        code: 400,
        message: 'could not parse params',
        _details: filter_props_res.error,
      });
    }

    const threads = await thread_service.get_filtered_threads(guild_id, filter_props_res.data);

    if (threads.isErr()) {
      return api_error({
        http_status_code: 500,
        error_message: 'Could not fetch watched threads',
        response: res,
        error_object: threads.error,
      });
    }

    const hydrated_threads = await hydrate_threads(guild_id, threads.value);

    if (hydrated_threads.isErr()) {
      return res.status(500).json({
        code: 500,
        message: 'could not hydrate threads',
        _details: hydrated_threads.error,
      });
    }

    res.json(hydrated_threads.value);
  },
);

const route: RouteFile = {
  path: '/guild',
  router,
};

export default route;
