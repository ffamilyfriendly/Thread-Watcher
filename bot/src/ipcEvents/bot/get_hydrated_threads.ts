import { client } from '@providers/client';
import { logger } from '@providers/logger';
import { ThreadMetadata } from '@watcher/shared';
import { PrivateEvent } from 'interfaces/PrivateEvents';
import { err, ok, ResultAsync } from 'neverthrow';
import { convert_snowflake_to_date } from 'services/ThreadService';
import { map_err } from 'utilities/error';

const event: PrivateEvent<{
  guild_id: string;
  ids: string[];
}> = {
  event_name: 'FETCH_EXT_THREAD_DATA',
  async event_callback({ guild_id, ids }) {
    if (!client.application) return err(new Error('Client not ready'));
    const hydrated: ThreadMetadata[] = [];

    for (const id of ids) {
      const chn_res = await ResultAsync.fromPromise(client.channels.fetch(id), map_err);
      if (chn_res.isErr()) {
        logger.warn(`FETCH_EXT_THREAD_DATA could not fetch thread`, id, chn_res.error);
        continue;
      }

      if (!chn_res.value) {
        logger.warn(`FETCH_EXT_THREAD_DATA fetched null value`, id);
        continue;
      }

      const thr = chn_res.value;

      if (!thr.isThread()) {
        logger.silly('FETCH_EXT_THREAD_DATA fetched non-thread item', id);
        continue;
      }

      const parent_channel = thr.parent
        ? ({
            channel_id: thr.parent.id,
            display_name: thr.parent.name,
          } as const)
        : undefined;

      hydrated.push({
        thread_id: id,
        display_name: thr.name,
        last_activity: thr.lastMessageId
          ? convert_snowflake_to_date(thr.lastMessageId)
          : new Date('2003-05-01'),
        parent_channel,
      });
    }

    return ok(hydrated);
  },
};

export default event;
