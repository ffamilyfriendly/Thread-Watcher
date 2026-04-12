import { client } from '@providers/client';
import { logger } from '@providers/logger';
import { ThreadMetadata } from '@watcher/shared';
import { ChannelType, GuildMember, PrivateThreadChannel, PublicThreadChannel } from 'discord.js';
import { PrivateEvent } from '#/interfaces/PrivateEvents';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { convert_snowflake_to_date } from '#/services/ThreadService';
import { map_err } from '#/utilities/error';

function get_bump_mode(
  thread: PublicThreadChannel | PrivateThreadChannel,
  guild_member: GuildMember,
): 'MESSAGE' | 'EDIT' | 'CANNOT_BUMP' {
  const perms = thread.permissionsFor(guild_member);

  if (perms.has('ManageThreads')) return 'EDIT';
  if (thread.type !== ChannelType.PrivateThread && perms.has('SendMessagesInThreads'))
    return 'MESSAGE';
  return 'CANNOT_BUMP';
}

// This previously used "fetch" instead of the cache.
// However, we're doing quite a lot of calls in this event and this is not a very critical number
const FETCH_MSGES_AMOUNT = 10;
const MAX_RECENT_MSG_AGE = 1000 * 60 * 60;
async function get_recent_messages(thread: PublicThreadChannel | PrivateThreadChannel) {
  const recent_msges = thread.messages.cache
    .values()
    .toArray()
    .filter((m) => {
      const msg_age = Date.now() - m.createdTimestamp;
      return msg_age < MAX_RECENT_MSG_AGE;
    });

  return ok(recent_msges.length);
}

const event: PrivateEvent<{
  guild_id: string;
  ids: string[];
}> = {
  event_name: 'FETCH_EXT_THREAD_DATA',
  async event_callback({ guild_id, ids }) {
    if (!client.application) return err(new Error('Client not ready'));
    const hydrated: ThreadMetadata[] = [];

    const bot_member = await ResultAsync.fromPromise(
      client.guilds.fetch(guild_id),
      map_err,
    ).andThen((g) => {
      return ResultAsync.fromPromise(g.members.fetchMe(), map_err);
    });

    if (bot_member.isErr()) return err(bot_member.error);

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
        recent_messages_count: (await get_recent_messages(thr)).unwrapOr(-1),
        thread_bump_mode: get_bump_mode(thr, bot_member.value),
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
