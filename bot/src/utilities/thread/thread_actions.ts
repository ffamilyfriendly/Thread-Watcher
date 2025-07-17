import { database, logger } from 'bot';
import { GenericThread } from './type';

/**
 * This function exists as thread.lastMessage is often NULL even tho thread.lastMessageId exists.
 * We dont actually need any of the message deets. We just want the time it was sent and we can extract that from the snowflake
 * @param snowflake ID of the message
 * @returns date when message was sent
 * @see https://github.com/vegeta897/snow-stamp/blob/main/src/convert.js
 */
export function convert_snowflake_to_date(snowflake: string) {
  const DISCORD_EPOCH = 1420070400000;
  const snowflake_as_ms = BigInt(snowflake) >> 22n;
  return new Date(Number(snowflake_as_ms) + DISCORD_EPOCH);
}

/**
 *
 * @param auto_archive_duration_minutes The auto archive duration setting of the thread
 * @param last_activity Whenever the last activity (message sent, edit, un-archival) of the thread was
 * @see https://discord.com/developers/docs/topics/threads#active-archived-threads
 */
export function get_stale_timestamp(
  auto_archive_duration_minutes: number,
  last_activity: Date = new Date(0),
): Date {
  const auto_archive_duration_as_ms = auto_archive_duration_minutes * 60 * 1000;
  return new Date(last_activity.getTime() + auto_archive_duration_as_ms);
}

export function add_thread(thread: GenericThread) {
  const last_activity = thread.lastMessageId
    ? convert_snowflake_to_date(thread.lastMessageId)
    : thread.createdAt;

  const expires_at = get_stale_timestamp(
    thread.autoArchiveDuration ?? 0,
    last_activity ?? undefined,
  );

  logger.debug(`thread ${thread.name} expires at: ${expires_at.toISOString()}`);

  return database.insert_thread({
    thread_id: thread.id,
    guild_id: thread.guildId,
    auto_archive_duration: expires_at,
  });
}
