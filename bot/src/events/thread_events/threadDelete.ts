import { ThreadChannel } from 'discord.js';
import { logger, thread_service } from 'bot';
import { Event } from 'interfaces/ClientEvent';

const event: Event<ThreadChannel> = {
  event_name: 'threadDelete',
  event_callback(thread) {
    thread_service.delete_thread(thread.id);
  },
};

export default event;
