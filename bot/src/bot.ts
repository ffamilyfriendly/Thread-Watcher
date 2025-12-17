import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { read_config } from './utilities/config';
import { Logger } from 'tslog';
import { load_module_as_and } from './utilities/load_files';
import { Event } from 'interfaces/ClientEvent';
import { BaseCommand } from 'interfaces/Command';
import { PrivateEvent } from 'interfaces/PrivateEvents';
import { BotIpcClient } from 'utilities/ipc_clients';
import get_database_instance from 'database';
import ThreadService from 'services/ThreadService';
import ChannelService from 'services/ChannelService';
import Redis from 'ioredis';
import SettingService from 'services/SettingService';
import ComponentService from 'services/ComponentService';
import { BotContextThreadFetcher } from 'fetchers/ThreadFetcher';
import i18next from 'i18next';
import { readFileSync } from 'fs';
import ThreadBumper from 'services/ThreadBumper';
import AuditService from 'services/AuditService';

const config_result = read_config();
const logger = new Logger({ name: 'bot' });
const commands = new Collection<string, BaseCommand>();

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
  return load_module_as_and<BaseCommand>(
    './src/commands',
    (modules) => {
      for (const command of modules) {
        const command_name =
          'parent_command' in command
            ? `${command.parent_command}.${command.command_data.name}`
            : command.command_data.name;
        commands.set(command_name, command);
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
const thread_bumper_service = new ThreadBumper();
const audit_service = new AuditService(database);

async function load_ipc_events() {
  return load_module_as_and<PrivateEvent>('./src/ipcEvents/bot', (modules) => {
    for (const event of modules) {
      logger.silly(`Registering IPC handler for: `, event.event_name);
      ipc_client.on(event.event_name, event.event_callback);
    }
  });
}

const resources = {
  'en-GB': { translation: JSON.parse(readFileSync('./locales/en/common.json', 'utf-8')) },
  'sv-SE': { translation: JSON.parse(readFileSync('./locales/sv/common.json', 'utf-8')) },
};

i18next.init({
  resources,
  fallbackLng: 'en-GB',
  interpolation: { escapeValue: false },
});

i18next.on('missingKey', (lng, ns, key) => {
  logger.warn(`Missing translation for ${key} (${ns}) in ${lng}`);
});

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
  thread_bumper_service,
  audit_service,
};

if (client.shard) {
  Promise.all([load_ipc_events(), load_events(), load_commands()]).then((res) => {
    for (const result of res) {
      if (result.isErr()) {
        logger.error(result.error);
        process.exit(1);
      }
    }
  });
  client.login(config.tokens.discord).catch((err) => {
    logger.fatal('Could not authenticate', err);
  });
} else {
  logger.warn(
    '"client.shard" not set. Will not attempt to login\n',
    'if you see this while running the deploy command everything is in order and you can disregard',
  );
  console.trace();
  process.exit(1);
}
