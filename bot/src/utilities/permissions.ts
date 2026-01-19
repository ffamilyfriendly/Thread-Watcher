import { GuildTextBasedChannel, PermissionFlagsBits } from 'discord.js';
import { err, ok, ResultAsync } from 'neverthrow';
import { map_err } from './error';

async function fetch_channel_perms(channel: GuildTextBasedChannel) {
  const bot_as_guild_member = await ResultAsync.fromPromise(
    channel.guild.members.fetchMe(),
    map_err,
  );
  if (bot_as_guild_member.isErr()) return err(bot_as_guild_member.error);

  return ok(channel.permissionsFor(bot_as_guild_member.value));
}

export async function bot_can_send_messages(channel: GuildTextBasedChannel) {
  return (
    channel.isSendable() &&
    (await fetch_channel_perms(channel)).match(
      (perm_mgr) => perm_mgr.has(PermissionFlagsBits.SendMessages),
      (_err) => false,
    )
  );
}

export async function bot_can_send_embed(channel: GuildTextBasedChannel) {
  return (
    channel.isSendable() &&
    (await fetch_channel_perms(channel)).match(
      (perm_mgr) =>
        perm_mgr.has(PermissionFlagsBits.SendMessages) &&
        perm_mgr.has(PermissionFlagsBits.EmbedLinks),
      (_err) => false,
    )
  );
}
