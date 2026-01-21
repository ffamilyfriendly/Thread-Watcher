import { logger } from '@providers/logger';
import { modules } from '@providers/modules';
import { Message } from 'discord.js';
import { Event } from 'interfaces/ClientEvent';

const event: Event<Message> = {
  event_name: 'messageCreate',
  async event_callback(msg) {
    const l = logger.getSubLogger({ name: 'messageCreate' });

    for (const mod of modules) {
      mod.on_message_create?.(msg, l).then((r) => {
        if (r.isErr()) {
          l.error(`Failed to run module '${mod.name}'`, r.error);
        }
      });
    }
  },
};

export default event;
