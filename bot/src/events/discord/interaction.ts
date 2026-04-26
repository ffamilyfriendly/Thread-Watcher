import { Interaction } from 'discord.js';
import { Event } from '#/interfaces/ClientEvent';

import Logger from '@providers/logger';
import { modules } from '@providers/modules';
import EmbeddableError from '#/utilities/error/EmbeddableError';
import { map_err } from '#/utilities/error';
import { config } from '@providers/config';
import { ok } from 'neverthrow';

const logger = Logger.instance;

const event: Event<Interaction> = {
  event_name: 'interactionCreate',
  async event_callback(interaction) {
    const l = logger.getSubLogger({ name: 'interaction' });
    if (config.limited_mode) return ok();
    for (const mod of await modules) {
      mod.on_interaction?.(interaction, l).then((r) => {
        if (r.isErr()) {
          if (interaction.isRepliable()) {
            EmbeddableError.handle_error(interaction, map_err(r.error));
          } else {
            l.error('NOT REPLIABLE');
          }
          l.error(`Failed to run module '${mod.name}'`, r.error);
        }
      });
    }
  },
};

export default event;
