import PQueue from 'p-queue';
import { ThreadData } from 'interfaces/Database';
import { err, ok, ResultAsync } from 'neverthrow';
import { SETTINGS_KEYS } from './SettingService';
import { setting_service, client as d_client, logger, thread_service } from 'bot';

export default class ThreadBumper {
  static DEFAULT_INTERVAL = 500;
  static DEFAULT_TIMEOUT = 1000 * 5;
  private queued_threads = new Set<string>();
  private queue = new PQueue({
    concurrency: 2,
    timeout: ThreadBumper.DEFAULT_TIMEOUT,
    intervalCap: 2,
    interval: ThreadBumper.DEFAULT_INTERVAL,
  });
  private l = logger.getSubLogger({ name: 'ThreadBumper' });

  private async bump_thread(thread_data: ThreadData) {
    this.l.debug('Fetching thread ', thread_data.id);
    const thread_res = await ResultAsync.fromSafePromise(d_client.channels.fetch(thread_data.id));
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
      const set_archived_res = await ResultAsync.fromSafePromise<unknown>(
        thread.setArchived(false),
      );

      if (set_archived_res.isErr())
        this.l.error(`could not un-archive thread ${thread.id}`, set_archived_res.error);
    }

    this.l.debug('Guild has BUMP_BEHAVIOUR: ', bump_behaviour);
    if (bump_behaviour === 'UNARCHIVE_ONLY') return ok();

    if (!thread.locked && thread.manageable) {
      const new_duration = thread.autoArchiveDuration === 10080 ? 4320 : 10080;

      this.l.debug(`Setting autoarchive to ${new_duration}`);
      const set_auto_archive_promise = thread.setAutoArchiveDuration(new_duration);

      const auto_archive_res = await ResultAsync.fromSafePromise<unknown>(set_auto_archive_promise);
      if (auto_archive_res.isErr())
        this.l.error(`could not bump thread w/ edit ${thread.id}`, auto_archive_res.error);
    } else if (thread.sendable && !thread.archived) {
      this.l.debug('bumping thread via text...');
      const send_bump_msg_res = await ResultAsync.fromSafePromise(thread.send('bumping thread.'));
      if (send_bump_msg_res.isErr())
        this.l.error(`could not bump thread w/ msg ${thread.id}`, send_bump_msg_res.error);
    }

    this.l.debug(thread_data.id, ' was handled!');
    return ok();
  }

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
