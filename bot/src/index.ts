import { PrivateEvent } from 'interfaces/PrivateEvents';
import { load_module_as_and } from 'utilities/load_files';
import { create_web_server } from 'web';
import { start_db_backup_routine } from 'routines/do_db_backup';
import { ResultAsync } from 'neverthrow';
import { map_err } from 'utilities/error';
import { start_cleanup_interval } from 'routines/do_cleanup';
import { ipc_client } from '@providers/ipc/shard_mgr_ipc_client';
import { sharding_manager } from '@providers/shardingmanager';
import Logger from '@providers/logger';
import { database } from '@providers/database';
import { config } from '@providers/config';
import { redis } from '@providers/redis';

const logger = Logger.child('Shard');

database.create_tables().then((res) => {
  if (res.isErr()) {
    logger.error('Could not create tables!', res.error);
    process.exit(1);
  }
});

async function load_events() {
  return load_module_as_and<PrivateEvent>('./src/ipcEvents/manager', (events_array) => {
    for (const event of events_array) {
      ipc_client.on(event.event_name, event.event_callback);
    }
  });
}

start_db_backup_routine();
start_cleanup_interval();
load_events();

sharding_manager.on('shardCreate', (shard) => {
  const shard_logger = logger.getSubLogger({ name: `Shard ${shard.id}` });
  shard.on('ready', () => {
    shard_logger.info(`Shard ready!`);
  });

  shard.on('death', () => {
    shard_logger.error(`Shard died`);
  });

  ipc_client.prepare();
});

if (config.web.enabled) {
  logger.info(`Opening web server on port ${config.web.port}...`);
  create_web_server();
}

sharding_manager.spawn();

async function shutdown() {
  logger.info('SHUTTING DOWN...');

  const redis_res = await ResultAsync.fromPromise(redis.quit(), map_err);

  if (redis_res.isErr()) {
    logger.error('Failed to close redis connection', redis_res.error);
  } else {
    logger.info('👍 closed redis connection');
  }

  const db_res = await database.close();
  if (db_res.isErr()) {
    logger.error('Failed to close database connection', db_res.error);
  } else {
    logger.info('👍 closed database connection');
  }

  // kill the shards so we dont leave orphans
  for (const [id, shard] of sharding_manager.shards) {
    logger.info(`💀 Killing shard ${id}`);
    shard.kill();
  }

  logger.info('👋 bye bye');
  process.exit(0);
}

process.on('SIGABRT', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
