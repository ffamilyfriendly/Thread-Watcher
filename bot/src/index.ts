import { ShardingManager } from 'discord.js';
import { read_config } from './utilities/config';
import { Logger } from 'tslog';
import { PrivateEvent } from 'interfaces/PrivateEvents';
import { load_module_as_and } from 'utilities/load_files';
import { ShardedIpcClient } from 'utilities/ipc_clients';
import { create_web_server } from 'web';
import get_database_instance from 'database';
import Redis from 'ioredis';
import ThreadService from 'services/ThreadService';
import { IndexContextThreadFetcher } from 'fetchers/ThreadFetcher';
import { start_db_backup_routine } from 'routines/do_db_backup';
import { S3Client } from 'bun';
import ChannelService from 'services/ChannelService';
import { ResultAsync } from 'neverthrow';
import { map_err } from 'utilities/error';
import AuditService from 'services/AuditService';

const config_result = read_config();
const logger = new Logger();

if (config_result.isErr()) {
  logger.fatal('Error when reading configuration file', config_result.error);
  process.exit(1);
}

const config = config_result.value;

const database = get_database_instance(config);
database.create_tables().then((res) => {
  if (res.isErr()) {
    logger.error('Could not create tables!', res.error);
    process.exit(1);
  }
});

const args = process.argv.slice(2);

const sharding_manager = new ShardingManager('./src/bot.ts', {
  token: config.tokens.discord,
  shardArgs: args,
});

const redis = new Redis();

const bucket_storage = new S3Client({
  region: 'auto',
  endpoint: config.bucket_storage.url,
  accessKeyId: config.bucket_storage.access_key_id,
  secretAccessKey: config.bucket_storage.secret_access_key,
});

const ipc_client = new ShardedIpcClient(sharding_manager, redis);
const thread_service = new ThreadService(
  database,
  redis,
  new IndexContextThreadFetcher(ipc_client),
);
const channel_service = new ChannelService(database, redis);
const audit_service = new AuditService(database);

async function load_events() {
  return load_module_as_and<PrivateEvent>('./src/ipcEvents/manager', (events_array) => {
    for (const event of events_array) {
      ipc_client.on(event.event_name, event.event_callback);
    }
  });
}

start_db_backup_routine();
load_events();

export {
  sharding_manager,
  ipc_client,
  config,
  logger,
  database,
  bucket_storage,
  thread_service,
  channel_service,
  audit_service,
  redis,
};

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
