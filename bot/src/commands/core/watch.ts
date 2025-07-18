import { logger } from 'bot';
import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  PermissionsBitField,
  SlashCommandBuilder,
  ThreadChannel,
} from 'discord.js';

import {
  Command,
  CommandError,
  CommandExecutionContext,
  PermissionsError,
  RegistrationScope,
} from 'interfaces/Command';
import { err, ok, Result } from 'neverthrow';
import { add_thread } from 'utilities/thread/thread_actions';

async function run(
  interaction: ChatInputCommandInteraction,
  ctx: CommandExecutionContext,
): Promise<Result<void, CommandError>> {
  const thread = interaction.options.getChannel('thread') || interaction.channel;

  if (!(thread instanceof ThreadChannel)) {
    return err(new Error('thread not instanceof threadchannel'));
  }

  return err(new PermissionsError(PermissionFlagsBits.Administrator, 'bot'));

  const result = await add_thread(thread);

  if (result.isErr()) return err(result.error);

  logger.info('watch result', result);

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
  },
  command_data,
  run,
};

export default command;
