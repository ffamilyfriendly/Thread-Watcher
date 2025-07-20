import { logger, thread_service } from 'bot';
import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
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
  const thread = interaction.options.getChannel('thread') || interaction.channel;

  if (!(thread instanceof ThreadChannel)) {
    return err(new Error('thread not instanceof threadchannel'));
  }

  const result = await thread_service.toggle_thread_watch_status(thread);

  if (result.isErr()) {
    interaction.reply('there is error!!!!!');
  } else {
    const embed = get_tagged_embed(interaction);

    embed.setTitle(`Thread ${result.value ? 'watched' : 'unwatched'}`);

    ctx.send_audit(embed);
  }

  return ok();
}

const command_data = new SlashCommandBuilder()
  .setName('watch')
  .setDescription("add or remove a thread from the bot's watchlist")
  .addChannelOption((o) =>
    o
      .setName('thread')
      .setDescription('thread to watch or unwatch')
      .addChannelTypes([
        ChannelType.AnnouncementThread,
        ChannelType.PublicThread,
        ChannelType.PrivateThread,
      ]),
  );

const command: Command = {
  command_scope: RegistrationScope.GLOBAL,
  access_control: {
    invoker_requires_permission: [PermissionFlagsBits.ManageThreads],
    channel_option_name: 'thread',
  },
  command_data,
  run,
};

export default command;
