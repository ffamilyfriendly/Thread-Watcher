import { config } from 'bot';
import { Channel, ChannelType, Guild, GuildBasedChannel } from 'discord.js';
import { EntitlementsError, GuildChatInteraction } from 'interfaces/BaseCommandInterface';
import { err, ok } from 'neverthrow';

const ALLOWED_CHANNEL_TYPES = [
  ChannelType.GuildCategory,
  ChannelType.GuildForum,
  ChannelType.GuildMedia,
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
] as const;

export type AllowedChannels = (typeof ALLOWED_CHANNEL_TYPES)[number];

export function check_channel_is_valid(
  channel: { type: ChannelType } | null,
): channel is GuildBasedChannel {
  if (!channel) return false;
  return (ALLOWED_CHANNEL_TYPES as readonly ChannelType[]).includes(channel.type);
}

export function get_target(interaction: GuildChatInteraction) {
  let parent = interaction.options.getChannel('parent') || interaction.channel;
  const global = interaction.options.getBoolean('global');

  if (global && interaction.entitlements.size == 0) {
    return err(new EntitlementsError(config.paywall.basic_sku));
  }

  let target: Guild | Channel;
  if (global) target = interaction.guild;
  else {
    if (!check_channel_is_valid(parent)) {
      return err(new Error('parent cannot hold threads'));
    }
    target = parent;
  }

  return ok(target);
}
