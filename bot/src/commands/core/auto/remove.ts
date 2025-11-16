import { channel_service } from 'bot';
import {
  ChannelType,
  ChatInputCommandInteraction,
  SlashCommandSubcommandBuilder,
} from 'discord.js';
import {
  CommandError,
  CommandExecutionContext,
  RegistrationScope,
  SubCommand,
} from 'interfaces/Command';
import { err, ok, Result } from 'neverthrow';
import { create_channel_link } from '../list';

async function run(
  interaction: ChatInputCommandInteraction,
  ctx: CommandExecutionContext,
): Promise<Result<void, CommandError>> {
  const target = interaction.options.getChannel('parent') ?? interaction.channel;

  if (!target || !('guild' in target)) return err(new Error('no channel bruh'));

  const res = await channel_service.remove_channel(target?.id);

  if (res.isErr()) return err(res.error);

  const embed = ctx.build_embed({
    title: 'Removed Monitor',
    style: 'success',
    description: `Removed channel monitor for ${create_channel_link(target)}`,
  });

  ctx.send_audit(embed);
  return ok();
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
