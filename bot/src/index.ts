import { Shard, ShardingManager } from 'discord.js';
import { read_config } from './utilities/config';
import { Logger } from 'tslog';
import { BaseEvent, PrivateEvent } from 'interfaces/PrivateEvents';
import { get_file_paths, load_module_as_and, load_paths_as_modules } from 'utilities/load_files';
import { PrivateInteraction, ShardedIpcClient } from 'utilities/PrivateInteraction';

const config_result = read_config();
const logger = new Logger();

if (config_result.isErr()) {
  logger.fatal('Error when reading configuration file', config_result.error);
  process.exit(1);
}

const config = config_result.value;

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

export { sharding_manager };

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

sharding_manager.spawn();
