import { ThreadChannel } from 'discord.js';
import { Event } from '#/interfaces/ClientEvent';
import { logger } from '@providers/logger';
import { modules } from '@providers/modules';
import { config } from '@providers/config';
import { ok } from 'neverthrow';

const event: Event<ThreadChannel, ThreadChannel> = {
  event_name: 'threadUpdate',
  async event_callback(old_thread, new_thread) {
    const l = logger.getSubLogger({ name: 'threadUpdate' });

    if (config.limited_mode) return ok();

    for (const mod of await modules) {
      mod.on_thread_update?.(old_thread, new_thread, l).then((r) => {
        if (r.isErr()) {
          l.error(`Failed to run module '${mod.name}'`, r.error);
        }
      });
    }
  },
};

export default event;
