import PQueue from 'p-queue';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { map_err } from '#/utilities/error';
import { ThreadData } from '@watcher/shared';
import DClient from '#/providers/client';
import Logger from '#/providers/logger';
import ThreadService from '#/providers/services/thread_service';
import SettingService from '#/providers/services/setting_service';
import { DiscordAPIError } from 'discord.js';

const d_client = DClient.instance;
const logger = Logger.instance;
const thread_service = ThreadService.instance;
const setting_service = SettingService.instance;

/**
 * ThreadBumper
 *
 * Responsible for discovering stale threads and "bumping" them to prevent
 * auto-archival or to unarchive them depending on guild configuration.
 *
 * Behavior:
 * - Periodically (when invoked) fetches stale threads from thread_service.
 * - Filters out threads that are already queued for bumping or whose guild is not in this shard.
 * - Enqueues bump jobs into an internal PQueue to rate-limit concurrent operations and avoid API throttling.
 * - For each thread, attempts to:
 *   1. Fetch the thread object from Discord.
 *   2. Respect the guild's bump behaviour setting (defaults to "BUMP_AND_UNARCHIVE"):
 *      - If the behaviour is "UNARCHIVE_ONLY": only unarchive the thread (if archived & unarchivable) and finish.
 *      - Otherwise, try to bump by either toggling auto-archive duration (if manageable & unlocked) or sending a message
 *        in the thread (if sendable and not archived).
 *   3. Unarchive the thread first when appropriate and possible.
 * - All operations emit debug logs and record non-fatal errors to the sub-logger.
 *
 * Implementation details:
 * - Uses an internal Set<string> to track queued thread IDs and prevent duplicate enqueues.
 * - Uses a PQueue configured with a small concurrency and interval settings to throttle requests.
 * - Uses ResultAsync wrappers for promise error handling and returns ok()/err() results from bump operations.
 *
 * Note:
 * - This class is tailored to the bot's surrounding services (logger, d_client, setting_service, thread_service)
 *   and uses their specific return types and error mapping conventions.
 *
 * @example
 * // Typical use: called periodically or by a scheduled job
 * await threadBumper.bump_stale();
 */
export default class ThreadBumper {
  /**
   * DEFAULT_INTERVAL
   *
   * Millisecond interval used by the internal PQueue for interval-based rate limiting.
   * Intended to control how quickly items from the queue are processed in bursts.
   */
  static DEFAULT_INTERVAL = 2000;
  /**
   * DEFAULT_TIMEOUT
   *
   * Millisecond timeout applied to queue tasks; individual bump operations exceeding this
   * duration will be considered failed/time-limited by the queue.
   */
  static DEFAULT_TIMEOUT = 1000 * 10;
  public queued_threads = new Set<string>();
  private queue = new PQueue({
    concurrency: 2,
    timeout: ThreadBumper.DEFAULT_TIMEOUT,
    intervalCap: 2,
    interval: ThreadBumper.DEFAULT_INTERVAL,
  });
  private l = logger.getSubLogger({ name: 'ThreadBumper' });

  private async bump_thread(thread_data: ThreadData): Promise<Result<unknown, any>> {
    // Helper to log errors and trigger backoff
    const handle_failure = async (id: string, message: string, error?: any) => {
      this.l.error(`${message} ${id}`, error);

      // 10003: Unknown Channel
      // we should be able to safely delete these
      if (error instanceof DiscordAPIError && error.code === 10003) {
        const t_del_res = await thread_service.delete_thread(thread_data.thread_id);
        if (t_del_res.isErr()) return err(t_del_res.error);
        return err(error || message);
      }

      const exp_res = await thread_service.set_exp_backoff(id);
      if (exp_res.isErr())
        this.l.error('failed to set exponential backoff', {
          thread_id: thread_data.thread_id,
          error: exp_res.error,
        });
      return err(error || message);
    };

    const thread_res = await ResultAsync.fromPromise(
      d_client.channels.fetch(thread_data.thread_id),
      map_err,
    );

    if (thread_res.isErr()) {
      return handle_failure(thread_data.thread_id, 'Could not fetch channel', thread_res.error);
    }

    const thread = thread_res.value;
    if (!thread || !thread.isThread()) {
      return handle_failure(thread_data.thread_id, 'Channel is null or not a thread');
    }

    // if the thread is archived and not unarchivable we cannot do anything with it.
    // Discord API does not allow edits of archived threads, other than archiving them.
    if (thread.archived && !thread.unarchivable) {
      return handle_failure(thread_data.thread_id, 'Skipping archived thread (unarchivable)');
    }

    if (thread.archived && thread.unarchivable) {
      const set_archived_res = await ResultAsync.fromPromise<unknown, Error>(
        thread.edit({ archived: false }),
        map_err,
      );
      if (set_archived_res.isErr()) {
        return handle_failure(thread.id, 'Failed to unarchive', set_archived_res.error);
      }

      // If we're un-archiving a thread we are already inherently bumping it.
      // We can therefore safely terminate the function here
      return thread_service.bump_thread_time(thread);
    }

    const bump_behaviour_res = await setting_service.get_setting(thread.guildId, 'BUMP_BEHAVIOUR');
    if (bump_behaviour_res.isErr()) {
      return err(bump_behaviour_res.error);
    }

    const bump_behaviour = bump_behaviour_res.value;
    if (bump_behaviour === 'UNARCHIVE_ONLY' || thread.locked) return ok();

    if (!thread.locked && thread.manageable) {
      const new_duration = thread.autoArchiveDuration === 10080 ? 4320 : 10080;
      const auto_archive_res = await ResultAsync.fromPromise<unknown, Error>(
        thread.setAutoArchiveDuration(new_duration),
        map_err,
      );

      if (auto_archive_res.isErr()) {
        return handle_failure(
          thread.id,
          'Auto-archive duration bump failed',
          auto_archive_res.error,
        );
      }
    } else if (thread.sendable && !thread.archived) {
      // TODO: set up a more pleasant message than this
      const send_bump_msg_res = await ResultAsync.fromPromise(
        thread.send('bumping thread.'),
        map_err,
      );

      if (send_bump_msg_res.isErr()) {
        return handle_failure(thread.id, 'Message-based bump failed', send_bump_msg_res.error);
      }
    } else {
      return handle_failure(thread.id, 'Thread is locked or not manageable/sendable');
    }

    return await thread_service.bump_thread_time(thread);
  }

  public async bump_stale() {
    const stale = await thread_service.get_stale_threads_for_guilds(
      Array.from(d_client.guilds.cache.keys()),
    );
    if (stale.isErr()) return stale.error;

    const threads_to_bump = stale.value.filter(
      (thread) => !this.queued_threads.has(thread.thread_id),
    );

    if (threads_to_bump.length > 0)
      this.l.info(`adding ${threads_to_bump.length} stale threads to queue...`);

    threads_to_bump.forEach((thread) => {
      this.queued_threads.add(thread.thread_id);
      const prom = this.queue.add(async () => {
        const res = await this.bump_thread(thread);
        if (res.isErr()) {
          this.l.error(`Could not bump ${thread.thread_id}: `, res.error);
        }
        this.queued_threads.delete(thread.thread_id);
      });

      ResultAsync.fromPromise(prom, map_err).then((r) => {
        if (r.isErr()) logger.error(`PQueue err on bumping thread '${thread.thread_id}'`, r.error);
      });
    });
  }
}
