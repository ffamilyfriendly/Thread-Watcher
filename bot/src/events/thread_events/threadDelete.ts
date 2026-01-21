import { ThreadChannel } from 'discord.js';
import { Event } from 'interfaces/ClientEvent';
import { modules } from '@providers/modules';
import { logger } from '@providers/logger';

const event: Event<ThreadChannel> = {
  event_name: 'threadDelete',
  async event_callback(thread) {
    const l = logger.getSubLogger({ name: 'THREAD_UPDATE' });

    for (const mod of modules) {
      mod.on_thread_delete?.(thread, l).then((r) => {
        if (r.isErr()) {
          l.error(`Failed to run module '${mod.name}'`, r.error);
        }
      });
    }
  },
};

export default event;
