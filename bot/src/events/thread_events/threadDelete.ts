import { ThreadChannel } from 'discord.js';
import { logger } from 'bot';
import { Event } from 'interfaces/ClientEvent';

const event: Event<ThreadChannel> = {
  event_name: 'threadDelete',
  event_callback(thread) {
    logger.debug(`hi delete`);
  },
};

export default event;
