import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { read_config } from './utilities/config';
import { Logger } from 'tslog';
import { load_module_as_and } from './utilities/load_files';
import { Event } from 'interfaces/ClientEvent';
import { Command } from 'interfaces/Command';
import { PrivateEvent } from 'interfaces/PrivateEvents';
import { BotIpcClient } from 'utilities/PrivateInteraction';
import get_database_instance from 'database';
import ThreadService from 'services/ThreadService';
import ChannelService from 'services/ChannelService';
import Redis from 'ioredis';
import SettingService from 'services/SettingService';
import ComponentService from 'services/ComponentService';
import { BotContextThreadFetcher } from 'fetchers/ThreadFetcher';

const config_result = read_config();
const logger = new Logger({ name: 'bot' });
const commands = new Collection<string, Command>();

if (config_result.isErr()) {
  logger.fatal('Error when reading configuration file', config_result.error);
  process.exit(1);
}

const config = config_result.value;

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

async function load_events(refresh_events = false) {
  return load_module_as_and<Event>(
    './src/events',
    (modules) => {
      for (const event of modules) {
        if (refresh_events) client.removeAllListeners(event.event_name);
        client.on(event.event_name, event.event_callback);
      }
    },
    refresh_events,
  );
}

async function load_commands(refresh_commands = false) {
  return load_module_as_and<Command>(
    './src/commands',
    (modules) => {
      for (const command of modules) {
        commands.set(command.command_data.name, command);
      }
    },
    refresh_commands,
  );
}

const ipc_client = new BotIpcClient(client);
const database = get_database_instance(config);
const redis = new Redis();

// Services
const thread_service = new ThreadService(database, redis, new BotContextThreadFetcher(client));
const setting_service = new SettingService(database, redis);
const component_service = new ComponentService();
const channel_service = new ChannelService(database, redis);

async function load_ipc_events() {
  return load_module_as_and<PrivateEvent>('./src/ipcEvents/bot', (modules) => {
    for (const event of modules) {
      ipc_client.on(event.event_name, event.event_callback);
    }
  });
}

export {
  logger,
  commands,
  config,
  load_commands,
  client,
  ipc_client,
  database,
  thread_service,
  setting_service,
  component_service,
  channel_service,
  redis,
};

if (client.shard) {
  load_ipc_events();
  load_events();
  load_commands();
  client.login(config.tokens.discord).catch((err) => {
    logger.fatal('Could not authenticate', err);
  });
} else {
  logger.warn(
    '"client.shard" not set. Will not attempt to login\n',
    'if you see this while running the deploy command everything is in order and you can disregard',
  );
}
