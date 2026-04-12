import { redis } from '@providers/redis';
import { sharding_manager } from '@providers/shardingmanager';
import { create_singleton } from '@providers/singleton';
import { ShardedIpcClient } from '#/utilities/ipc_clients';

const singleton = create_singleton(() => new ShardedIpcClient(sharding_manager, redis));
export default singleton;
export const ipc_client = singleton.instance;
