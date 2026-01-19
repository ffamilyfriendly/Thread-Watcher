import { ThreadChannel } from 'discord.js';
import { audit_service, thread_service } from 'bot';
import { Event } from 'interfaces/ClientEvent';
import { logger } from 'index';

const event: Event<ThreadChannel> = {
  event_name: 'threadDelete',
  async event_callback(thread) {
    const changes = await thread_service.delete_thread(thread.id);
    if (changes.isErr()) {
      logger.error('Could not delete thread!', changes.error);
      return;
    }

    if (changes.value != 0) {
      audit_service.log_event('THREAD_UNWATCHED', thread.guildId!, '@self', {
        target_id: thread.id,
        reason: 'Thread was deleted',
      });
    }
  },
};

export default event;
