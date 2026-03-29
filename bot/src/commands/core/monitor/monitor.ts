import { SlashCommandBuilder } from 'discord.js';
import { BaseCommand, RegistrationScope } from 'interfaces/BaseCommandInterface';
import { command_data as add } from './add';
import { command_data as remove } from './remove';

const command_data = new SlashCommandBuilder()
  .setName('monitor')
  .setDescription('Manage your channel monitors')
  .addSubcommand(add)
  .addSubcommand(remove);

const command: BaseCommand = {
  command_scope: RegistrationScope.GLOBAL,
  access_control: {},
  command_data,
};

export default command;
