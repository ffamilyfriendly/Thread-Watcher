import PQueue from 'p-queue';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { map_err } from '#/utilities/error';
import { ThreadData } from '@watcher/shared';
import DClient from '#/providers/client';
import Logger from '#/providers/logger';
import ThreadService from '#/providers/services/thread_service';
import SettingService from '#/providers/services/setting_service';
import { DiscordAPIError } from 'discord.js';
import get_bumper_message from '#/utilities/discord_components/bumper_message';

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

  private async handle_bump_error(thread_id: string, error: Error, trigger_exp_backoff?: boolean) {
    const ERROR_UNKNOWN_CHANNEL = 10003;
    const ERROR_MISSING_ACCESS = 50001;
    const ERROR_LACKING_PERMISSIONS = 50013;

    this.l.error('failed to bump thread', {
      thread_id,
      error: error,
    });

    if (error instanceof DiscordAPIError && error.code === ERROR_UNKNOWN_CHANNEL) {
      thread_service.delete_thread(thread_id).then((delete_thread_res) => {
        if (delete_thread_res.isOk()) return;
        this.l.error('failed to delete thread', {
          thread_id,
          error: delete_thread_res.error,
        });
      });
    }

    const guild_configuration_issue =
      error instanceof DiscordAPIError &&
      (error.code === ERROR_MISSING_ACCESS || error.code === ERROR_LACKING_PERMISSIONS);

    if (guild_configuration_issue || trigger_exp_backoff) {
      thread_service.set_exp_backoff(thread_id).then((set_backoff_result) => {
        if (set_backoff_result.isOk()) return;
        this.l.error('failed to set exp backoff', {
          thread_id,
          error: set_backoff_result.error,
        });
      });
    }

    return err(error);
  }

  private async bump_thread(thread_data: ThreadData): Promise<Result<unknown, any>> {
    const thread_res = await ResultAsync.fromPromise(
      d_client.channels.fetch(thread_data.thread_id),
      map_err,
    );

    if (thread_res.isErr()) {
      return this.handle_bump_error(thread_data.thread_id, thread_res.error);
    }

    const thread = thread_res.value;
    if (!thread || !thread.isThread()) {
      return this.handle_bump_error(
        thread_data.thread_id,
        new Error('Channel is null or not a thread'),
        true,
      );
    }

    // if the thread is archived and not unarchivable we cannot do anything with it.
    // Discord API does not allow edits of archived threads, other than un-archiving them.
    if (thread.archived && !thread.unarchivable) {
      return this.handle_bump_error(thread_data.thread_id, new Error('thread unarchivable'), true);
    }

    if (thread.archived) {
      const set_archived_res = await ResultAsync.fromPromise<unknown, Error>(
        thread.edit({ archived: false }),
        map_err,
      );

      return set_archived_res.match(
        (_ok) => thread_service.bump_thread_time(thread),
        (e) => this.handle_bump_error(thread.id, e),
      );
    }

    const bump_behaviour_res = await setting_service.get_setting(thread.guildId, 'BUMP_BEHAVIOUR');
    if (bump_behaviour_res.isErr()) {
      return err(bump_behaviour_res.error);
    }

    const bump_behaviour = bump_behaviour_res.value;
    if (bump_behaviour === 'UNARCHIVE_ONLY' || thread.locked) return ok();

    // Editable is all we need for autoarchiveduration.
    if (thread.editable) {
      const new_duration = thread.autoArchiveDuration === 10080 ? 4320 : 10080;
      const auto_archive_res = await ResultAsync.fromPromise<unknown, Error>(
        thread.setAutoArchiveDuration(new_duration),
        map_err,
      );

      if (auto_archive_res.isOk()) {
        return await thread_service.bump_thread_time(thread);
      }

      this.l.warn(
        `Auto-archive duration bump failed for ${thread.id}, falling back to message bump`,
      );
    }

    if (thread.sendable && !thread.archived) {
      const send_bump_msg_res = await ResultAsync.fromPromise(
        thread.send(get_bumper_message(thread)),
        map_err,
      );

      if (send_bump_msg_res.isErr()) {
        return this.handle_bump_error(thread.id, send_bump_msg_res.error);
      }
    } else {
      return this.handle_bump_error(
        thread.id,
        new Error('Thread is locked or not manageable/sendable'),
        true,
      );
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
