import { ticket_service } from '@providers/services/ticket_service';
import {
  ChannelType,
  ChatInputCommandInteraction,
  SlashCommandSubcommandBuilder,
} from 'discord.js';
import { RegistrationScope } from '#/interfaces/BaseCommandInterface';
import { CommandContext, SubCommand } from '#/interfaces/Command';
import claim_ticket_action from '#/modules/ticket/_actions/claim_ticket';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { map_err } from '#/utilities/error';
import { CommandError } from '#/utilities/error/def';
import mark_ticket_as_resolved from '#/modules/ticket/_actions/mark_resolved';

async function run(
  interaction: ChatInputCommandInteraction,
  ctx: CommandContext,
): Promise<Result<void, CommandError>> {
  const assign_target_channel_id =
    interaction.options.getChannel('ticket-thread')?.id ?? interaction.channelId;

  const ticket = await ticket_service.get_ticket_from_thread_id(assign_target_channel_id);
  if (ticket.isErr()) return err(ticket.error);

  mark_ticket_as_resolved(interaction, ticket.value);

  const should_claim_ticket = await mark_ticket_as_resolved(interaction, ticket.value);
  if (should_claim_ticket.isErr()) return err(should_claim_ticket.error);

  return ok();
}

export const command_data = new SlashCommandSubcommandBuilder()
  .setName('resolve')
  .setDescription('resolves this ticket')
  .addChannelOption((o) =>
    o
      .setName('ticket-thread')
      .setDescription('The ticket you want to target (default: current channel)')
      .addChannelTypes([ChannelType.PublicThread, ChannelType.PrivateThread]),
  );

const command: SubCommand = {
  command_scope: RegistrationScope.GLOBAL,
  access_control: {},
  command_data,
  parent_command: 'ticket',
  run,
};

export default command;
