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
import { CommandContext, type Command } from 'interfaces/Command';
import { err, ok, Result } from 'neverthrow';
import { AuditMeta, PartialAuditObject } from 'services/AuditService';
import { CommandError, DatabaseError, WrongChannelType } from 'utilities/error/def';

async function run(
  interaction: ChatInputCommandInteraction,
  ctx: CommandContext,
): Promise<Result<void, CommandError>> {
  const thread = interaction.options.getChannel('thread') || interaction.channel;

  if (!(thread instanceof ThreadChannel)) {
    return err(
      new WrongChannelType(thread?.id ?? 'thread_id', [
        ChannelType.PublicThread,
        ChannelType.PrivateThread,
        ChannelType.AnnouncementThread,
      ]),
    );
  }

  const audit_meta: AuditMeta = {
    executor_id: interaction.user.id,
    guild_id: interaction.guildId!,
  };

  const result = await thread_service.toggle_thread_watch_status(thread, audit_meta);

  if (result.isErr()) return err(result.error);

  return ok();
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
