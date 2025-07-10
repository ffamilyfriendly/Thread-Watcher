import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { read_config } from './utilities/config';
import { Logger } from 'tslog';
import { get_file_paths, load_module_as_and, load_paths_as_modules } from './utilities/load_files';
import { Event } from './interfaces/ClientEvent';
import { Command } from 'interfaces/Command';
import { BaseEvent, PrivateEvent } from 'interfaces/PrivateEvents';
import { PrivateInteraction } from 'utilities/PrivateInteraction';

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

const events = new Map<string, (data: unknown, interaction: PrivateInteraction) => void>();
async function load_ipc_events() {
  return load_module_as_and<PrivateEvent>('./src/ipcEvents/bot', (modules) => {
    for (const event of modules) {
      events.set(event.event_name, event.event_callback);
    }
  });
}

load_ipc_events();

if (!client.shard) {
  process.exit(1);
}

process.on('message', (data: BaseEvent) => {
  logger.debug(`got IPC event with type ${data.type ?? 'UNTYPED'}`);
  const handler = events.get(data.type);

  if (handler) {
    if (!client.shard) {
      process.exit(1);
    }

    const interaction = new PrivateInteraction(client.shard, data.request_id);
    handler(data.data, interaction);
  } else {
    logger.debug(`no handler was registered`, data);
  }
});

export { logger, commands, config, load_commands, client };

load_events();
load_commands();

client.login(config.tokens.discord).catch((err) => {
  logger.fatal('Could not authenticate', err);
});
