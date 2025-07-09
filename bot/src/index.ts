import { Shard, ShardingManager } from 'discord.js';
import { read_config } from './utilities/config';
import { Logger } from 'tslog';
import { BaseEvent, PrivateEvent } from 'interfaces/PrivateEvents';
import { get_file_paths, load_paths_as_modules } from 'utilities/load_files';
import { PrivateInteraction } from 'utilities/PrivateInteraction';

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

const events = new Map<string, (data: unknown, interaction: PrivateInteraction) => void>();
async function load_events() {
  const event_paths = get_file_paths('./src/ipcEvents/manager', { file_extention: 'ts' });
  const event_modules_result = await load_paths_as_modules<PrivateEvent>(event_paths);

  if (event_modules_result.isErr()) {
    logger.fatal('could not load event modules!', event_modules_result.error);
  } else {
    const event_modules = event_modules_result.value;
    logger.debug(`succesfully loaded ${event_modules.length} modules!`);
    for (const event of event_modules) {
      events.set(event.event_name, event.event_callback);
    }
  }
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

  shard.on('message', (data: BaseEvent) => {
    shard_logger.debug(`got IPC event with type ${data.type ?? 'UNTYPED'}`);
    const handler = events.get(data.type);

    if (handler) {
      shard_logger.debug(`handler was registered!`);
      const interaction = new PrivateInteraction(shard, data.request_id);
      handler(data.data, interaction);
    } else {
      shard_logger.debug(`no handler was registered`);
    }
  });
});

sharding_manager.spawn();
