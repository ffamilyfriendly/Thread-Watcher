import { ThreadChannel } from 'discord.js';
import Ts from '@providers/services/thread_service';
import As from '@providers/services/audit_service';
import Logger from '@providers/logger';
import { Event } from 'interfaces/ClientEvent';
const thread_service = Ts.instance;
const audit_service = As.instance;
const logger = Logger.instance;

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
