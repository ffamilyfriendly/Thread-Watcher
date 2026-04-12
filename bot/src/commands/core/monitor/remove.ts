import { channel_service } from '@providers/services/channel_service';
import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandSubcommandBuilder,
} from 'discord.js';
import { RegistrationScope } from '#/interfaces/BaseCommandInterface';
import { CommandContext, type SubCommand } from '#/interfaces/Command';
import { err, Result } from 'neverthrow';
import { CommandError } from '#/utilities/error/def';
import { safe_reply } from '#/utilities/interaction_helpers';

async function run(
  interaction: ChatInputCommandInteraction,
  ctx: CommandContext,
): Promise<Result<unknown, CommandError>> {
  const target = interaction.options.getChannel('parent') ?? interaction.channel;

  // We should never see this as Thread-Watcher only works in guilds where an interaction should always have a channel
  if (!target) return err(new Error('target channel was undefined'));

  const res = await channel_service.remove_monitor(target.id, {
    executor_id: interaction.user.id,
    guild_id: interaction.guildId!,
  });

  if (res.isErr()) return err(res.error);

  const e = ctx.build_embed('success');
  e.setTitle(ctx.t('commands.monitors.monitor_removed_title'));
  e.setDescription(ctx.t('commands.monitors.monitor_removed_body', { monitor_id: target.id }));

  return safe_reply(interaction, { embeds: [e], flags: 'Ephemeral' });
}

export const command_data = new SlashCommandSubcommandBuilder()
  .setName('remove')
  .setDescription('test command remove')
  .addChannelOption((o) =>
    o
      .setName('parent')
      .setDescription('The channel to stop monitoring')
      .addChannelTypes([
        ChannelType.GuildCategory,
        ChannelType.GuildForum,
        ChannelType.GuildMedia,
        ChannelType.GuildText,
        ChannelType.GuildAnnouncement,
      ]),
  );

const command: SubCommand = {
  command_scope: RegistrationScope.GLOBAL,
  access_control: {
    invoker_requires_permission: [PermissionFlagsBits.ManageThreads],
    channel_option_name: 'parent',
  },
  command_data,
  parent_command: 'monitor',
  run,
};

export default command;
