import { err, ok, Result, ResultAsync } from 'neverthrow';
import { get_audit_embed, PartialAuditObject } from 'services/AuditService';
import { SETTINGS_KEYS } from 'services/SettingService';
import { map_err } from './error';
import { bot_can_send_embed } from './permissions';
import { PermissionsError } from 'interfaces/Command';
import { EmbedBuilder, Message } from 'discord.js';
import { Logger } from 'tslog';
import { DatabaseError } from 'interfaces/Database';
import { client } from '@providers/client';
import { setting_service } from '@providers/services/setting_service';

async function get_audit_as_embed(event: PartialAuditObject) {
  const user = await ResultAsync.fromPromise(client.users.fetch(event.executor_id), map_err);
  const guild = await ResultAsync.fromPromise(client.guilds.fetch(event.guild_id), map_err);
  if (user.isErr()) return err(user.error);
  if (guild.isErr()) return err(guild.error);

  return get_audit_embed(event, guild.value.preferredLocale, user.value);
}

export async function log_event_in_log_channel(
  event: PartialAuditObject,
): Promise<Result<Message<true> | null, Error>>;

export async function log_event_in_log_channel(
  embeds: EmbedBuilder[],
  guild_id: string,
): Promise<Result<Message<true> | null, Error>>;

export async function log_event_in_log_channel(
  event_or_embed: PartialAuditObject | EmbedBuilder[],
  guild_id?: string,
): Promise<Result<Message<true> | null, Error>> {
  let embeds;
  // if event_or_embed is EmbedBuilder[], guild_id is enforced
  // if it's an PartialAuditObject we grab it from the object
  let g_id = guild_id!;
  if (!Array.isArray(event_or_embed)) {
    const as_embed = await get_audit_as_embed(event_or_embed);
    if (as_embed.isErr()) return err(as_embed.error);
    g_id = event_or_embed.guild_id;
    embeds = [as_embed.value];
  } else embeds = event_or_embed;

  const LOGGING_CHANNEL = await setting_service.get_setting<string>(
    g_id,
    SETTINGS_KEYS.logging_channel,
  );

  if (LOGGING_CHANNEL.isErr()) return err(map_err(LOGGING_CHANNEL.error));
  if (!LOGGING_CHANNEL.value) return ok(null);

  const logging_channel =
    LOGGING_CHANNEL.isOk() && LOGGING_CHANNEL.value !== null
      ? await ResultAsync.fromPromise(client.channels.fetch(LOGGING_CHANNEL.value), map_err)
      : ok(null);

  if (logging_channel.isErr()) return err(logging_channel.error);

  const logging_channel_is_defined_and_in_guild =
    logging_channel &&
    logging_channel.isOk() &&
    logging_channel.value &&
    logging_channel.value.isTextBased() &&
    !logging_channel.value.isDMBased();

  const can_send_as_separate_log =
    logging_channel_is_defined_and_in_guild && (await bot_can_send_embed(logging_channel.value));

  if (!can_send_as_separate_log) return err(new PermissionsError('EmbedLinks', 'bot'));

  return await ResultAsync.fromPromise(logging_channel.value.send({ embeds }), map_err);
}

export async function try_log(
  event: Promise<Result<PartialAuditObject, DatabaseError>>,
  logger: Logger<unknown>,
) {
  const res = await event;
  if (res.isErr()) {
    logger.error(`Could not log event:`, res.error);
    return err(res.error);
  }

  return log_event_in_log_channel(res.value);
}
