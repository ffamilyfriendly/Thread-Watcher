import { ThreadChannel } from 'discord.js';
import { logger } from 'bot';
import { Event } from 'interfaces/ClientEvent';
import { check_should_be_watched } from './threadUpdate';

const event: Event<ThreadChannel> = {
  event_name: 'threadCreate',
  async event_callback(thread) {
    console.log('mf was created');
    const l = logger.getSubLogger({ name: 'THREAD_CREATE' });
    check_should_be_watched(thread, l);
  },
};

export default event;
