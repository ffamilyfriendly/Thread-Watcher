import { load_module_as_and } from './load_files';
import { BaseCommand } from '#/interfaces/Command';
import { Event } from '#/interfaces/ClientEvent';
import { PrivateEvent } from '#/interfaces/PrivateEvents';
import { Client, Collection } from 'discord.js';
import { Logger } from 'tslog';
import { BotIpcClient } from './ipc_clients';
import { logger } from '@providers/logger';

export async function load_events(client: Client, refresh_events = false) {
  return load_module_as_and<Event>(
    './src/events/discord',
    (modules) => {
      for (const event of modules) {
        if (refresh_events) client.removeAllListeners(event.event_name);
        logger.silly(`Bound ${event.event_name}`);
        client.on(event.event_name, event.event_callback);
      }
    },
    refresh_events,
  );
}

export async function load_commands(
  commands: Collection<string, BaseCommand>,
  refresh_commands = false,
) {
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

export async function load_ipc_events(logger: Logger<unknown>, ipc_client: BotIpcClient) {
  return load_module_as_and<PrivateEvent>('./src/events/IPC/bot', (modules) => {
    for (const event of modules) {
      logger.silly(`Registering IPC handler for: `, event.event_name);
      ipc_client.on(event.event_name, event.event_callback);
    }
  });
}
