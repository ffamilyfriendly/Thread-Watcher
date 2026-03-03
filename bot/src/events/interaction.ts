import { Interaction } from 'discord.js';
import { Event } from 'interfaces/ClientEvent';

import Logger from '@providers/logger';
import { modules } from '@providers/modules';

const logger = Logger.instance;

const event: Event<Interaction> = {
  event_name: 'interactionCreate',
  async event_callback(interaction) {
    const l = logger.getSubLogger({ name: 'interaction' });
    for (const mod of await modules) {
      mod.on_interaction?.(interaction, l).then((r) => {
        if (r.isErr()) {
          l.error(`Failed to run module '${mod.name}'`, r.error);
        }
      });
    }
  },
};

export default event;
