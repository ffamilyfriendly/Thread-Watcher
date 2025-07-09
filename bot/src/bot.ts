import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { read_config } from './utilities/config';
import { Logger } from 'tslog';
import { get_file_paths, load_paths_as_modules } from './utilities/load_files';
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
  const event_paths = get_file_paths('./src/events', { file_extention: 'ts' });
  const event_modules_result = await load_paths_as_modules<Event>(event_paths, refresh_events);

  if (event_modules_result.isErr()) {
    logger.fatal('could not load event modules!', event_modules_result.error);
  } else {
    const event_modules = event_modules_result.value;
    logger.debug(`succesfully loaded ${event_modules.length} modules!`);
    for (const event of event_modules) {
      if (refresh_events) client.removeAllListeners(event.event_name);
      client.on(event.event_name, event.event_callback);
    }
  }
}

async function load_commands(refresh_commands = false) {
  const command_paths = get_file_paths('./src/commands', { file_extention: 'ts' });
  const command_modules_result = await load_paths_as_modules<Command>(
    command_paths,
    refresh_commands,
  );

  if (command_modules_result.isErr()) {
    logger.fatal('could not load event modules!', command_modules_result.error);
  } else {
    const command_modules = command_modules_result.value;
    for (const command of command_modules) {
      commands.set(command.command_data.name, command);
    }
  }
}

const events = new Map<string, (data: unknown, interaction: PrivateInteraction) => void>();
async function load_ipc_events() {
  const event_paths = get_file_paths('./src/ipcEvents/bot', { file_extention: 'ts' });
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
    logger.debug(`no handler was registered`);
  }
});

export { logger, commands, config, load_commands, client };

load_events();
load_commands();

client.login(config.tokens.discord).catch((err) => {
  logger.fatal('Could not authenticate', err);
});
