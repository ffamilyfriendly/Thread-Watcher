import { ticket_service } from '@providers/services/ticket_service';
import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import { RegistrationScope } from '#/interfaces/BaseCommandInterface';
import { CommandContext, SubCommand } from '#/interfaces/Command';
import claim_ticket_action from '#/modules/ticket/_actions/claim_ticket';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { map_err } from '#/utilities/error';
import { CommandError } from '#/utilities/error/def';

async function run(
  interaction: ChatInputCommandInteraction,
  ctx: CommandContext,
): Promise<Result<void, CommandError>> {
  const assign_to_user = interaction.options.getUser('assign-to') ?? interaction.user;

  const user_as_member = await ResultAsync.fromPromise(
    interaction.guild!.members.fetch(assign_to_user.id),
    map_err,
  );
  if (user_as_member.isErr()) return err(user_as_member.error);

  const assign_target_channel_id =
    interaction.options.getChannel('ticket-thread')?.id ?? interaction.channelId;

  const ticket = await ticket_service.get_ticket_from_thread_id(assign_target_channel_id);
  if (ticket.isErr()) return err(ticket.error);

  const should_claim_ticket = await claim_ticket_action(
    interaction,
    ticket.value,
    user_as_member.value,
  );
  if (should_claim_ticket.isErr()) return err(should_claim_ticket.error);

  return ok();
}

export const command_data = new SlashCommandSubcommandBuilder()
  .setName('assign')
  .setDescription('Assign this ticket to a user (default: assign to self)')
  .addUserOption((o) =>
    o.setName('assign-to').setDescription('The user you want to assign to this ticket'),
  );

const command: SubCommand = {
  command_scope: RegistrationScope.GLOBAL,
  access_control: {},
  command_data,
  parent_command: 'ticket',
  run,
};

export default command;
