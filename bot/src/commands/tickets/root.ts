import { SlashCommandBuilder } from 'discord.js';
import { BaseCommand, RegistrationScope } from '#/interfaces/BaseCommandInterface';
import { command_data as view_notes } from './view_notes';
import { command_data as new_note } from './new_note';
import { command_data as assign_ticket } from './assign_ticket';

const command_data = new SlashCommandBuilder()
  .setName('ticket')
  .setDescription('ticket stuff')
  .addSubcommand(view_notes)
  .addSubcommand(new_note)
  .addSubcommand(assign_ticket);

const command: BaseCommand = {
  command_scope: RegistrationScope.GLOBAL,
  access_control: {},
  command_data,
};

export default command;
