import { AuditLogEvent, ThreadChannel } from 'discord.js';
import { audit_service, channel_service, client, logger, thread_service } from 'bot';
import { Event } from 'interfaces/ClientEvent';
import ThreadService from 'services/ThreadService';
import { Logger } from 'tslog';
import { ResultAsync } from 'neverthrow';
import { log_event_in_log_channel, try_log } from 'utilities/log_channel_stuff';

export async function check_should_be_watched(thread: ThreadChannel, l: Logger<unknown>) {
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
    if (watch_res.isErr()) return l.error(`could not watch thread:`, watch_res.error);
    audit_service.log_event('THREAD_WATCHED', thread.guildId, '@self', {
      target_id: thread.id,
      reason: 'thread fullfills filters of monitor!',
    });
    l.info(`watched ${thread.id}`);
  } else {
    const unwatch_res = await thread_service.unwatch_thread(thread);
    if (unwatch_res.isErr()) return l.error('could not unwatch thread:', unwatch_res.error);
    audit_service.log_event('THREAD_UNWATCHED', thread.guildId, '@self', {
      target_id: thread.id,
      reason: 'thread no longer fullfills monitor filters of monitor',
    });
  }
}

async function check_watched_and_bump(thread: ThreadChannel, l: Logger<unknown>) {
  const res = await thread_service.get_thread(thread.id);
  if (res.isErr()) return l.error(res.error);
  if (!res.value) return l.debug(`Thread ${thread.id} is not watched`);

  const res_bump = await thread_service.bump_thread_time(thread);
  if (res_bump.isErr()) return l.error(res_bump.error);
}

const event: Event<ThreadChannel, ThreadChannel> = {
  event_name: 'threadUpdate',
  async event_callback(_old_thread, thread) {
    const l = logger.getSubLogger({ name: 'THREAD_UPDATE' });

    const audit = await ResultAsync.fromPromise(
      thread.guild.fetchAuditLogs({
        type: AuditLogEvent.ThreadUpdate,
        limit: 10,
      }),
      (err) => err,
    ).match(
      (ok_val) => ok_val,
      (err_val) => {
        l.error(`Could not fetch audit log`, err_val);
        return null;
      },
    );

    const audit_entry = audit?.entries.find((audit_entry) => audit_entry.targetId == thread.id);
    const change = audit_entry?.changes.find((change) => change.key == 'archived');

    if (change?.new) {
      l.info(
        `Thread ${thread.id} was unwatched due to manual archival by ${audit_entry?.executorId}`,
      );
      const unwatch_res = await thread_service.unwatch_thread(thread);
      if (unwatch_res.isErr()) return l.error('could not unwatch thread:', unwatch_res.error);
      const unwatch_event = audit_service.log_event(
        'THREAD_UNWATCHED',
        thread.guildId!,
        audit_entry?.executorId ?? 'UNKNOWN',
        {
          target_id: thread.id,
          reason: 'thread was manually closed',
        },
      );

      try_log(unwatch_event, l);

      return;
    }

    if (thread.archived && thread.unarchivable) {
      const could_archive = await ResultAsync.fromPromise(thread.setArchived(false), (err) => err);
      if (could_archive.isErr()) {
        l.error(`Could not unarchive ${thread.id}:`, could_archive.error);
      }
    }

    check_should_be_watched(thread, l);
    check_watched_and_bump(thread, l);
  },
};

export default event;
