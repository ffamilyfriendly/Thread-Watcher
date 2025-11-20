import { ThreadChannel } from 'discord.js';
import { channel_service, client, logger, thread_service } from 'bot';
import { Event } from 'interfaces/ClientEvent';
import ThreadService from 'services/ThreadService';
import { Logger } from 'tslog';

async function check_should_be_watched(thread: ThreadChannel, l: Logger<unknown>) {
  if (!thread.parentId) return;
  const res = await channel_service.get_channel(thread.parentId);
  if (res.isErr()) return l.error(res.error);

  const channel = res.value;
  if (!channel) return l.debug('no channel monitor');

  const res_thread = await thread_service.get_thread(thread.id);
  if (res_thread.isErr()) return l.error(res_thread.error);
  if (res_thread.value && !res_thread.value.is_managed)
    return l.debug(`thread ${thread.id} not managed by monitor for ${thread.parentId}`);

  const should_be_watched = await ThreadService.should_be_watched(client, thread, channel);
  if (should_be_watched.isErr()) return l.error('thing');

  if (should_be_watched.value) {
    const watch_res = await thread_service.watch_thread(thread);
    if (watch_res.isErr()) return l.error(`could not watch thread`);
    l.info(`watched ${thread.id}`);
  } else {
    thread_service.unwatch_thread(thread);
  }
}

async function check_watched_and_bump(thread: ThreadChannel, l: Logger<unknown>) {
  const res = await thread_service.get_thread(thread.id);
  if (res.isErr()) return l.error(res.error);
  if (!res.value) return l.debug(`Thread ${thread.id} is not watched`);

  const res_bump = await thread_service.bump_thread_time(thread);
  if (res_bump.isErr()) return l.error(res_bump.error);
}

const event: Event<ThreadChannel> = {
  event_name: 'threadUpdate',
  async event_callback(thread) {
    const l = logger.getSubLogger({ name: 'THREAD_UPDATE' });

    check_should_be_watched(thread, l);
    check_watched_and_bump(thread, l);
  },
};

export default event;
