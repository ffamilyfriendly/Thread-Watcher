import { AuditLogEvent, ThreadChannel } from 'discord.js';
import { Event } from 'interfaces/ClientEvent';
import ThreadService from 'services/ThreadService';
import { err, ok, ResultAsync } from 'neverthrow';
import { try_log } from 'utilities/log_channel_stuff';

import LoggerThing from '@providers/logger';
import Client from '@providers/client';
import As from '@providers/services/audit_service';
import Ts from '@providers/services/thread_service';
import Cs from '@providers/services/channel_service';
import { Logger } from 'tslog';

const logger = LoggerThing.instance;
const audit_service = As.instance;
const thread_service = Ts.instance;
const client = Client.instance;
const channel_service = Cs.instance;

async function fetch_responsible_manager(thread: ThreadChannel) {
  const res_thread = await thread_service.get_thread(thread.id);
  if (res_thread.isErr()) return err(res_thread.error);

  if (res_thread.value && res_thread.value.managed_by) {
    const mgr = await channel_service.get_channel(res_thread.value.managed_by);
    if (mgr.isErr()) return err(mgr.error);
    if (mgr.value) return ok(mgr.value);
    // Unsure how we want to treat a managed thread that somehow does not have a parent?
    // We'll figure this out some day lol
  }

  const guild_id = thread.guildId;
  const category_id = thread.parent?.parentId;
  const channel_id = thread.parentId;

  const find_monitor = async (id?: string | null) => {
    if (!id) return ok(null);
    return channel_service.get_channel(id);
  };

  const result = await find_monitor(channel_id)
    .then((res) => (res.isOk() && res.value ? res : find_monitor(category_id)))
    .then((res) => (res.isOk() && res.value ? res : find_monitor(guild_id)));

  return result;
}

export async function check_should_be_watched(thread: ThreadChannel, l: Logger<unknown>) {
  console.log('TRHEAD_PARENT_ID', thread.parentId);
  if (!thread.parentId) return;
  const res = await fetch_responsible_manager(thread);
  if (res.isErr()) return l.error(res.error);

  const monitor = res.value;
  if (!monitor) return l.debug('no channel monitor');

  const res_thread = await thread_service.get_thread(thread.id);
  if (res_thread.isErr()) return l.error(res_thread.error);
  if (res_thread.value && !res_thread.value?.managed_by)
    return l.debug(`thread ${thread.id} not managed by monitor for ${thread.parentId}`);

  const should_be_watched = await ThreadService.should_be_watched(client, thread, monitor);
  if (should_be_watched.isErr())
    return l.error('Could not determine if thread should be watched!', should_be_watched.error);

  if (should_be_watched.value) {
    const watch_res = await thread_service.watch_thread(thread, monitor.id);
    if (watch_res.isErr()) return l.error(`could not watch thread:`, watch_res.error);
    audit_service.log_event('THREAD_WATCHED', thread.guildId, client.user?.id!, {
      target_id: thread.id,
      reason: 'thread fullfills filters of monitor!',
    });
    l.info(`watched ${thread.id}`);
  } else {
    const unwatch_res = await thread_service.unwatch_thread(thread);
    if (unwatch_res.isErr()) return l.error('could not unwatch thread:', unwatch_res.error);
    audit_service.log_event('THREAD_UNWATCHED', thread.guildId, client.user?.id!, {
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
