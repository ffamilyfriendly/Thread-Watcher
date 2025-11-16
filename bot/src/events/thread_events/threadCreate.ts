import { ThreadChannel } from 'discord.js';
import { channel_service, client, logger, thread_service } from 'bot';
import { Event } from 'interfaces/ClientEvent';
import ThreadService from 'services/ThreadService';
import { AdvancedFilterOptions } from 'services/ChannelService';

const event: Event<ThreadChannel> = {
  event_name: 'threadCreate',
  async event_callback(thread) {
    const l = logger.getSubLogger({ name: 'THREAD_CREATE' });
    if (!thread.parentId) return;

    const res = await channel_service.get_channel(thread.parentId);
    if (res.isErr()) return console.error(res.error);

    const channel = res.value;
    if (!channel) return l.debug('no channel monitor');
    const should_be_watched = await ThreadService.should_be_watched(client, thread, channel);
    if (should_be_watched.isErr()) return l.error('thing');

    if (should_be_watched.value) {
      const watch_res = await thread_service.watch_thread(thread);
      if (watch_res.isErr()) return l.error(`could not watch thread`);
      l.info(`watched ${thread.id}`);
    }
  },
};

export default event;
