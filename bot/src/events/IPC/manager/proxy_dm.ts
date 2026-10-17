import { ipc_client } from '@providers/ipc/shard_mgr_ipc_client';
import { define_typed_event } from '../shared/typed_events';
import { redis } from 'bun';
import { err, ok, ResultAsync } from 'neverthrow';
import { map_err } from '#/utilities/error';

export default define_typed_event('proxy_dm', async (cnt) => {
  const dest_guild_id = await ResultAsync.fromPromise(redis.get(cnt.channel_id), map_err);
  if (dest_guild_id.isErr()) return err(dest_guild_id.error);
  if (!dest_guild_id.value) return err(new Error('no guild_id!'));
  const shard = await ipc_client.get_shard_from_guild_id(dest_guild_id.value);
  if (shard.isErr()) return err(shard.error);
  const shard_fr = ipc_client.shards.get(shard.value);
  if (!shard_fr) return err(new Error('shard not found'));

  return ipc_client.with_schema(shard_fr, 'proxy_dm', cnt);
});
