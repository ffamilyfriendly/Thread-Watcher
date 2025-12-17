import PQueue from 'p-queue';
import { ThreadData } from 'interfaces/Database';
import { err, ok, ResultAsync } from 'neverthrow';
import { SETTINGS_KEYS } from './SettingService';
import { setting_service, client as d_client, logger, thread_service } from 'bot';
import { map_err } from 'utilities/error';

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
  static DEFAULT_INTERVAL = 500;
  /**
   * DEFAULT_TIMEOUT
   *
   * Millisecond timeout applied to queue tasks; individual bump operations exceeding this
   * duration will be considered failed/time-limited by the queue.
   */
  static DEFAULT_TIMEOUT = 1000 * 5;
  private queued_threads = new Set<string>();
  private queue = new PQueue({
    concurrency: 2,
    timeout: ThreadBumper.DEFAULT_TIMEOUT,
    intervalCap: 2,
    interval: ThreadBumper.DEFAULT_INTERVAL,
  });
  private l = logger.getSubLogger({ name: 'ThreadBumper' });

  /**
   * bump_thread(thread_data)
   *
   * Attempt to perform the configured "bump" action for a single thread.
   *
   * Steps:
   * 1. Fetch the channel by ID; ensure it exists and is a Thread.
   * 2. Read guild setting for bump behaviour (fallback: "BUMP_AND_UNARCHIVE").
   * 3. If the thread is archived and unarchivable, attempt to unarchive it.
   * 4. If bump behaviour is "UNARCHIVE_ONLY", return success after unarchiving (or when unarchiving is not possible).
   * 5. Otherwise:
   *    - If the thread is not locked and manageable, toggle the auto-archive duration between two presets
   *      (10080 <-> 4320 minutes) to create activity without sending a message.
   *    - Else if the thread is sendable and not archived, send a small "bumping thread." message to bump it.
   * 6. Log successes and non-fatal errors; return an ok() result on success or err(...) with diagnostic information.
   *
   * Parameters:
   * - thread_data: ThreadData — minimal thread descriptor containing at least id and server/guild id.
   *
   * Remarks:
   * - **DOES NOT** set the new bump time within this function. That's handled within the event handlers (threadUpdate, messageCreate)\
   *   This is because these handlers will update the thread's stale time anyhow and if we bump the thread via msg/editing those events will be taken care of automatically
   *
   * Returns:
   * - A result-style value (ok()/err()) indicating success or carrying an error value describing the failure.
   */
  private async bump_thread(thread_data: ThreadData) {
    const thread_res = await ResultAsync.fromPromise(
      d_client.channels.fetch(thread_data.id),
      map_err,
    );
    if (thread_res.isErr()) return err(thread_res.error);
    if (!thread_res.value) return err('no thread returned');
    const thread = thread_res.value;

    if (!thread.isThread()) return err('not a thread');

    const bump_behaviour_res = await setting_service.get_setting_with_default<string | null>(
      thread.guildId,
      SETTINGS_KEYS.bump_behaviour,
      'BUMP_AND_UNARCHIVE',
    );

    if (bump_behaviour_res.isErr()) return err(bump_behaviour_res.error);
    if (!bump_behaviour_res.value) return err('bump_behaviour was null');
    const bump_behaviour = bump_behaviour_res.value;
    if (thread.archived && thread.unarchivable) {
      const set_archived_res = await ResultAsync.fromPromise<unknown, Error>(
        thread.setArchived(false),
        map_err,
      );

      if (set_archived_res.isErr())
        this.l.error(`could not un-archive thread ${thread.id}`, set_archived_res.error);
    }

    this.l.silly('Guild has BUMP_BEHAVIOUR: ', bump_behaviour);
    if (bump_behaviour === 'UNARCHIVE_ONLY') return ok();

    if (!thread.locked && thread.manageable) {
      const new_duration = thread.autoArchiveDuration === 10080 ? 4320 : 10080;

      const set_auto_archive_promise = thread.setAutoArchiveDuration(new_duration);

      const auto_archive_res = await ResultAsync.fromPromise<unknown, Error>(
        set_auto_archive_promise,
        map_err,
      );
      if (auto_archive_res.isErr())
        this.l.error(`could not bump thread w/ edit ${thread.id}`, auto_archive_res.error);
    } else if (thread.sendable && !thread.archived) {
      const send_bump_msg_res = await ResultAsync.fromPromise(
        thread.send('bumping thread.'),
        map_err,
      );
      if (send_bump_msg_res.isErr())
        this.l.error(`could not bump thread w/ msg ${thread.id}`, send_bump_msg_res.error);
    }

    return ok();
  }

  /**
   * bump_stale()
   *
   * Discover stale threads and schedule bump jobs for them.
   *
   * Steps:
   * 1. Retrieve stale threads via thread_service.get_stale_threads().
   * 2. If retrieval fails, propagate/return the error.
   * 3. Filter out threads that are already scheduled (tracked in queued_threads) and
   *    threads whose guild is not present in the client's guild cache.
   * 4. For each remaining thread:
   *    - Mark its id in queued_threads to prevent duplicate scheduling.
   *    - Add an async job to the internal PQueue which calls bump_thread(thread).
   *    - After the job completes (success or failure), remove the id from queued_threads.
   * 5. Log the number of threads enqueued and any per-thread errors encountered during execution.
   *
   * Returns:
   * - Promise<void> on success (after scheduling jobs). If fetching stale threads fails, returns the error value from the fetch.
   */
  public async bump_stale() {
    const stale = await thread_service.get_stale_threads();
    if (stale.isErr()) return stale.error;

    // this is probably lousy lol.
    const threads_to_bump = stale.value.filter(
      (thread) => !this.queued_threads.has(thread.id) && d_client.guilds.cache.has(thread.server),
    );

    this.l.debug(`adding ${threads_to_bump.length} stale threads to queue...`);
    threads_to_bump.forEach((thread) => {
      this.queued_threads.add(thread.id);
      this.queue.add(async () => {
        const res = await this.bump_thread(thread);
        if (res.isErr()) {
          this.l.error(`Could not bump ${thread.id}: `, res.error);
        }
        this.queued_threads.delete(thread.id);
      });
    });
  }
}
