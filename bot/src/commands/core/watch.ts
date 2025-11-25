import { audit_service, logger, thread_service } from 'bot';
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
import { AuditType } from 'services/AuditService';
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
    return err(result.error);
  } else {
    const embed = get_tagged_embed(interaction);

    const [thread_action, audit_type] = result.value
      ? ['watch', 'WATCH_THREAD' as AuditType]
      : ['unwatch', 'UNWATCH_THREAD' as AuditType];

    audit_service.log_event(audit_type, interaction.guildId!, interaction.user.id, {
      command_name: interaction.commandName,
    });

    const thread_text = ctx.t('commands.watch.thread', {});
    const thread_action_text = ctx.t(`commands.watch.${thread_action}`, {});
    embed.setTitle(`${thread_text} <#${thread.id}> ${thread_action_text}`);

    ctx.send_audit(embed);
  }

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
    bot_requires_permission: [PermissionFlagsBits.ManageThreads],
    channel_option_name: 'thread',
  },
  command_data,
  run,
};

export default command;
