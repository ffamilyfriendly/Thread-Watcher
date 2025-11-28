import { audit_service, thread_service } from 'bot';
import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  ThreadChannel,
} from 'discord.js';

import { Command, CommandError, RegistrationScope } from 'interfaces/Command';
import { err, Result } from 'neverthrow';
import { AuditType } from 'services/AuditService';
import { CommandContext } from 'utilities/command_context';

async function run(
  interaction: ChatInputCommandInteraction,
  ctx: CommandContext,
): Promise<Result<void, CommandError>> {
  const thread = interaction.options.getChannel('thread') || interaction.channel;

  if (!(thread instanceof ThreadChannel)) {
    return err(new Error('thread not instanceof threadchannel'));
  }

  const result = await thread_service.toggle_thread_watch_status(thread);

  if (result.isErr()) {
    return err(result.error);
  } else {
    const audit_type: AuditType = result.value ? 'THREAD_WATCHED' : 'THREAD_UNWATCHED';

    const log = await audit_service.log_event(
      audit_type,
      interaction.guildId!,
      interaction.user.id,
      {
        command_name: interaction.commandName,
        target_id: thread.id,
      },
    );

    if (log.isErr()) return ctx.err(log.error);

    ctx.send_audit(log.value);
  }

  return ctx.ok();
}

const command_data = new SlashCommandBuilder()
  .setName('watch')
  .setDescription("Add or remove a thread from the bot\'s active monitoring list")
  .addChannelOption((o) =>
    o
      .setName('thread')
      .setDescription('The thread to start or stop monitoring')
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
    bot_requires_permission: [PermissionFlagsBits.ManageThreads],
    channel_option_name: 'thread',
  },
  command_data,
  run,
};

export default command;
