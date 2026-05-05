import { config } from '@providers/config';
import { entitlement_service } from '@providers/services/entitlement_service';
import { Channel, ChannelType, Guild, GuildBasedChannel } from 'discord.js';
import { GuildChatInteraction } from '#/interfaces/BaseCommandInterface';
import { err, ok } from 'neverthrow';
import { EntitlementsError } from '#/utilities/error/def';

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

export async function get_target(interaction: GuildChatInteraction, allow_topgg_vote = false) {
  let parent = interaction.options.getChannel('parent') || interaction.channel;
  const global = interaction.options.getBoolean('global');

  if (global && allow_topgg_vote) {
    const res = await entitlement_service.get_topgg_vote_or_premium(interaction.guildId);
    if (!res) return err(new EntitlementsError(config.paywall.basic_sku, 'global'));
  } else if (global) {
    const has_sku = await entitlement_service.has_premium(interaction.guildId);

    if (has_sku.isErr()) return err(has_sku.error);

    if (!has_sku.value) return err(new EntitlementsError(config.paywall.basic_sku, 'global'));
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
