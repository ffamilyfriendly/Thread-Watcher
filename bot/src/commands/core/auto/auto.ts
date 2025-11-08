import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import { BaseCommand, RegistrationScope } from 'interfaces/Command';
import { command_data as add } from './add';
import { command_data as remove } from './remove';

const command_data = new SlashCommandBuilder()
  .setName('auto')
  .setDescription('hello im test')
  .addSubcommand(add)
  .addSubcommand(remove);

const command: BaseCommand = {
  command_scope: RegistrationScope.GLOBAL,
  access_control: {},
  command_data,
};

export default command;
