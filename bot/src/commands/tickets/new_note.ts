import { ticket_service } from '@providers/services/ticket_service';
import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import { RegistrationScope } from 'interfaces/BaseCommandInterface';
import { CommandContext, type SubCommand } from 'interfaces/Command';
import add_note_action from 'modules/ticket/_actions/add_note';
import { err, ok, Result } from 'neverthrow';
import { CommandError } from 'utilities/error/def';

async function run(
  interaction: ChatInputCommandInteraction,
  ctx: CommandContext,
): Promise<Result<void, CommandError>> {
  const ticket = await ticket_service.get_ticket_from_thread_id(interaction.channelId);
  if (ticket.isErr()) return err(ticket.error);
  if (!ticket.value) return err(new Error('ticket was null!'));
  const could_create_note = await add_note_action(interaction, ticket.value);
  if (could_create_note.isErr()) return err(could_create_note.error);

  return ok();
}

export const command_data = new SlashCommandSubcommandBuilder()
  .setName('new-note')
  .setDescription('Create a new staff only note for this ticket');

const command: SubCommand = {
  command_scope: RegistrationScope.GLOBAL,
  access_control: {},
  command_data,
  parent_command: 'ticket',
  run,
};

export default command;
