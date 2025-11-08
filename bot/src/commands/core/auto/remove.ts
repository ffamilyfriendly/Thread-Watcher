import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import {
  Command,
  CommandError,
  CommandExecutionContext,
  RegistrationScope,
  SubCommand,
} from 'interfaces/Command';
import { ok, Result } from 'neverthrow';

function run(
  interaction: ChatInputCommandInteraction,
  ctx: CommandExecutionContext,
): Result<void, CommandError> {
  interaction.reply('remove');
  return ok();
}

export const command_data = new SlashCommandSubcommandBuilder()
  .setName('remove')
  .setDescription('test command remove');

const command: SubCommand = {
  command_scope: RegistrationScope.GLOBAL,
  access_control: {},
  command_data,
  parent_command: 'test',
  run,
};

export default command;
