import { audit_service } from '@providers/services/audit_service';
import { channel_service } from '@providers/services/channel_service';
import {
  ChannelType,
  ChatInputCommandInteraction,
  SlashCommandSubcommandBuilder,
} from 'discord.js';
import { RegistrationScope } from 'interfaces/BaseCommandInterface';
import { type SubCommand } from 'interfaces/Command';
import { err, Result } from 'neverthrow';
import { CommandContext } from 'utilities/command_context';
import { CommandError } from 'utilities/error/def';

async function run(
  interaction: ChatInputCommandInteraction,
  ctx: CommandContext,
): Promise<Result<void, CommandError>> {
  const target = interaction.options.getChannel('parent') ?? interaction.channel;

  if (!target || !('guild' in target)) return err(new Error('no channel bruh'));

  const res = await channel_service.remove_monitor(target?.id, {
    executor_id: interaction.user.id,
    guild_id: interaction.guildId!,
  });

  if (res.isErr()) return err(res.error);

  return ctx.ok();
}

export const command_data = new SlashCommandSubcommandBuilder()
  .setName('remove')
  .setDescription('test command remove')
  .addChannelOption((o) =>
    o
      .setName('parent')
      .setDescription('The channel to start or stop monitoring')
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
  access_control: {},
  command_data,
  parent_command: 'auto',
  run,
};

export default command;
