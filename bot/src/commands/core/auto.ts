import { logger, thread_service } from 'bot';
import {
  ChannelType,
  ChatInputCommandInteraction,
  GuildChannel,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
  ThreadChannel,
} from 'discord.js';

import {
  Command,
  CommandError,
  CommandExecutionContext,
  RegistrationScope,
} from 'interfaces/Command';
import { err, ok, Result } from 'neverthrow';
import { get_tagged_embed } from 'utilities/embed';

async function run(
  interaction: ChatInputCommandInteraction,
  ctx: CommandExecutionContext,
): Promise<Result<void, CommandError>> {
  const parent = interaction.options.getChannel('parent') || interaction.channel;
  const advanced = !!interaction.options.getBoolean('advanced');

  if (!parent || !('threads' in parent)) {
    return err(new Error('parent cannot hold threads'));
  }

  return ok();
}

const command_data = new SlashCommandBuilder()
  .setName('auto')
  .setDescription('automatically watch threads in channel')
  .addChannelOption((o) =>
    o
      .setName('parent')
      .setDescription('The thread to start or stop monitoring')
      .addChannelTypes([
        ChannelType.GuildCategory,
        ChannelType.GuildForum,
        ChannelType.GuildMedia,
        ChannelType.GuildText,
        ChannelType.GuildAnnouncement,
      ]),
  )
  .addBooleanOption((opt) =>
    opt.setName('advanced').setDescription('if u wanna use advanced options idk'),
  );

const command: Command = {
  command_scope: RegistrationScope.GLOBAL,
  access_control: {
    invoker_requires_permission: [PermissionFlagsBits.ManageThreads],
    channel_option_name: 'parent',
  },
  command_data,
  run,
};

export default command;
