import { client } from '@providers/client';
import { audit_service } from '@providers/services/audit_service';
import { channel_service } from '@providers/services/channel_service';
import { entitlement_service } from '@providers/services/entitlement_service';
import { guild_service } from '@providers/services/guild_service';
import { thread_service } from '@providers/services/thread_service';
import { AuditLogEvent, Message, ThreadChannel } from 'discord.js';
import { Module } from 'interfaces/Module';
import { err, ok, ResultAsync } from 'neverthrow';
import ThreadService from 'services/ThreadService';
import { Logger } from 'tslog';
import { map_err } from 'utilities/error';
import { try_log } from 'utilities/log_channel_stuff';

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

  const search_ids = [thread.parentId, thread.parent?.parentId, thread.guildId];
  for (const id of search_ids) {
    if (!id) continue;
    const res = await channel_service.get_channel(id);
    if (res.isOk() && res.value) {
      if (res.value.id === res.value.server) {
        const entitlement_answer = await entitlement_service.has_basic(client, res.value.server);
        if (entitlement_answer.isErr()) return err(entitlement_answer.error);
        if (entitlement_answer.value === false) return ok(null);
      }

      return ok(res.value);
    }
  }

  return ok(null);
}

export async function check_should_be_watched(thread: ThreadChannel, l: Logger<unknown>) {
  if (!thread.parentId) return ok();
  const res = await fetch_responsible_manager(thread);
  if (res.isErr()) return err(map_err(res.error));

  const monitor = res.value;
  if (!monitor) {
    l.debug('no channel monitor');
    return ok();
  }

  const res_thread = await thread_service.get_thread(thread.id);
  if (res_thread.isErr()) return err(map_err(res_thread.error));
  if (res_thread.value && !res_thread.value?.managed_by) {
    l.debug(`thread ${thread.id} not managed by monitor for ${thread.parentId}`);
    return ok();
  }

  const should_be_watched = await ThreadService.should_be_watched(client, thread, monitor);
  if (should_be_watched.isErr()) {
    return err(
      new Error(`Could not determine if thread should be watched! ${should_be_watched.error}`),
    );
  }

  if (should_be_watched.value) {
    const watch_res = await thread_service.watch_thread(thread, monitor.id);
    if (watch_res.isErr()) return err(map_err(watch_res.error));
    audit_service.log_event('THREAD_WATCHED', thread.guildId, client.user?.id!, {
      target_id: thread.id,
      reason: 'thread fullfills filters of monitor!',
    });
    l.info(`watched ${thread.id}`);
  } else {
    const unwatch_res = await thread_service.unwatch_thread(thread);
    if (unwatch_res.isErr()) return err(map_err(unwatch_res.error));
    audit_service.log_event('THREAD_UNWATCHED', thread.guildId, client.user?.id!, {
      target_id: thread.id,
      reason: 'thread no longer fullfills monitor filters of monitor',
    });
  }

  return ok();
}

async function check_watched_and_bump(thread: ThreadChannel, l: Logger<unknown>) {
  const res = await thread_service.get_thread(thread.id);
  if (res.isErr()) return l.error(res.error);
  if (!res.value) return l.debug(`Thread ${thread.id} is not watched`);

  const res_bump = await thread_service.bump_thread_time(thread);
  if (res_bump.isErr()) return l.error(res_bump.error);
}

async function check_msg_should_bump_thread(msg: Message, l: Logger<unknown>) {
  if (!msg.guildId) return ok();

  guild_service.nullify_left_at(msg.guildId).then((res) => {
    if (res.isErr()) l.error(`Could not unmark guild '${msg.guildId}' as left!`, res.error);
  });

  if (!msg.channel.isThread()) return ok();

  check_should_be_watched(msg.channel, l);

  const res_thread = (await thread_service.get_thread(msg.channelId)).match(
    (value) => value,
    (err_value) => {
      l.error('could not fetch thread from db: ', err_value);
      return err(map_err(err_value));
    },
  );
  if (res_thread) thread_service.bump_thread_time(msg.channel);
  return ok();
}

async function on_thread_update(old: ThreadChannel, thread: ThreadChannel, l: Logger<unknown>) {
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
    if (unwatch_res.isErr()) {
      l.error('could not unwatch thread');
      return err(map_err(unwatch_res.error));
    }
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

    return ok();
  }

  if (thread.archived && thread.unarchivable) {
    const could_unarchive = await ResultAsync.fromPromise(
      // Make sure all flags carry over.
      // The Pinned flag is seemingly dropped when a thread is archived
      thread.edit({
        archived: false,
        flags: old.flags,
      }),
      (err) => err,
    );
    if (could_unarchive.isErr()) {
      l.error(`Could not unarchive ${thread.id}:`, could_unarchive.error);
    }
  }

  check_should_be_watched(thread, l);
  check_watched_and_bump(thread, l);
  return ok();
}

function on_thread_create(thread: ThreadChannel, l: Logger<unknown>) {
  return check_should_be_watched(thread, l);
}

async function on_thread_delete(thread: ThreadChannel, l: Logger<unknown>) {
  const changes = await thread_service.delete_thread(thread.id);
  if (changes.isErr()) {
    l.error('Could not delete thread!', changes.error);
    return err(map_err(changes.error));
  }

  if (changes.value != 0) {
    audit_service.log_event('THREAD_UNWATCHED', thread.guildId!, '@self', {
      target_id: thread.id,
      reason: 'Thread was deleted',
    });
  }

  return ok();
}

function on_message_create(message: Message, l: Logger<unknown>) {
  return check_msg_should_bump_thread(message, l);
}

const module: Module = {
  name: 'Core',
  on_thread_update,
  on_thread_create,
  on_thread_delete,
  on_message_create,
};

export default module;
