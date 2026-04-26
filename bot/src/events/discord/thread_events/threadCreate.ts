import { ThreadChannel } from 'discord.js';
import { Event } from '#/interfaces/ClientEvent';
import { logger } from '@providers/logger';
import { modules } from '@providers/modules';
import { config } from '@providers/config';
import { ok } from 'neverthrow';

const event: Event<ThreadChannel> = {
  event_name: 'threadCreate',
  async event_callback(thread) {
    const l = logger.getSubLogger({ name: 'threadCreate' });

    if (config.limited_mode) return ok();

    for (const mod of await modules) {
      mod.on_thread_create?.(thread, l).then((r) => {
        if (r.isErr()) {
          l.error(`Failed to run module '${mod.name}'`, r.error);
        }
      });
    }
  },
};

export default event;
