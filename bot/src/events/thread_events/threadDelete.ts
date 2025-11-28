import { ThreadChannel } from 'discord.js';
import { audit_service, thread_service } from 'bot';
import { Event } from 'interfaces/ClientEvent';

const event: Event<ThreadChannel> = {
  event_name: 'threadDelete',
  event_callback(thread) {
    thread_service.delete_thread(thread.id);
    audit_service.log_event('THREAD_UNWATCHED', thread.guildId!, '@self', {
      target_id: thread.id,
      reason: 'Thread was deleted',
    });
  },
};

export default event;
