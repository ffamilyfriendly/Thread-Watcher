import { audit_service } from '@providers/services/audit_service';
import { thread_service } from '@providers/services/thread_service';
import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  ThreadChannel,
} from 'discord.js';
import { RegistrationScope } from 'interfaces/BaseCommandInterface';
import { type Command } from 'interfaces/Command';
import { err, Result } from 'neverthrow';
import { PartialAuditObject } from 'services/AuditService';
import { CommandContext } from 'utilities/command_context';
import { CommandError, DatabaseError } from 'utilities/error/def';

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
    let log: Result<PartialAuditObject, DatabaseError>;
    if (result.value) {
      log = await audit_service.log_thread_watch(
        thread.id,
        thread.guildId,
        interaction.user.id,
        '',
      );
    } else {
      log = await audit_service.log_thread_unwatch(
        thread.id,
        thread.guildId,
        interaction.user.id,
        '',
      );
    }

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
    channel_option_name: 'thread',
  },
  command_data,
  run,
};

export default command;
