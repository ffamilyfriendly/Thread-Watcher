import { ipc_client } from '@providers/ipc/bot_ipc_client';
import { ticket_service } from '@providers/services/ticket_service';
import { AttachmentBuilder, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { RegistrationScope } from 'interfaces/BaseCommandInterface';
import { type Command } from 'interfaces/Command';
import { err, ok, Result } from 'neverthrow';
import { CommandContext } from 'utilities/command_context';
import { CommandError } from 'utilities/error/def';
import { ensure_deferred, safe_reply } from 'utilities/interaction_helpers';

async function run(
  interaction: ChatInputCommandInteraction,
  ctx: CommandContext,
): Promise<Result<void, CommandError>> {
  if (!interaction.channel?.isThread()) {
    interaction.reply('not a thread');
    return ok();
  }

  await ensure_deferred(interaction);

  const resolved_thread_id = await ticket_service.get_ticket_id_from_thread_id(
    interaction.channelId,
  );
  if (resolved_thread_id.isErr()) return err(resolved_thread_id.error);

  const ext = await ticket_service.get_ticket_view(resolved_thread_id.value);
  if (ext.isErr()) return err(ext.error);

  const attachment = new AttachmentBuilder(Buffer.from(JSON.stringify(ext.value)), {
    name: 'ticket_dump.json',
  });
  attachment.setName('ticket_dump.json');
  attachment.setDescription('a dump of this ticket');

  const could_reply = await safe_reply(interaction, { content: 'Dumped!', files: [attachment] });
  if (could_reply.isErr()) return err(could_reply.error);

  return ctx.ok();
}

const command_data = new SlashCommandBuilder()
  .setName('test')
  .setDescription('(DEV ONLY) remove this STG');

const command: Command = {
  command_scope: RegistrationScope.DEVELOPMENT_SERVER,
  access_control: {
    developer_only: true,
  },
  command_data,
  run,
};

export default command;
