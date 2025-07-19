import { ShardingManager } from 'discord.js';
import { read_config } from './utilities/config';
import { Logger } from 'tslog';
import { PrivateEvent } from 'interfaces/PrivateEvents';
import { load_module_as_and } from 'utilities/load_files';
import { ShardedIpcClient } from 'utilities/PrivateInteraction';
import { create_web_server } from 'web';
import get_database_instance from 'database';

const config_result = read_config();
const logger = new Logger();

if (config_result.isErr()) {
  logger.fatal('Error when reading configuration file', config_result.error);
  process.exit(1);
}

const config = config_result.value;

const database = get_database_instance(config);
database.create_tables()

const args = process.argv.slice(2);

const sharding_manager = new ShardingManager('./src/bot.ts', {
  token: config.tokens.discord,
  shardArgs: args,
});

const ipc_client = new ShardedIpcClient(sharding_manager);
async function load_events() {
  return load_module_as_and<PrivateEvent>('./src/ipcEvents/manager', (events_array) => {
    for (const event of events_array) {
      ipc_client.on(event.event_name, event.event_callback);
    }
  });
}

load_events();

export { sharding_manager, ipc_client, config };

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
