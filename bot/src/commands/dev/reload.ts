import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { ipc_client } from 'bot';
import {
  Command,
  CommandError,
  CommandExecutionContext,
  RegistrationScope,
} from 'interfaces/Command';
import { ok, Result } from 'neverthrow';

function run(
  interaction: ChatInputCommandInteraction,
  ctx: CommandExecutionContext,
): Result<void, CommandError> {
  ipc_client.send('reload', null);

  ctx.build_embed({
    title: 'reloaded commands!',
    description: 'actually works???',
    style: 'success',
    ephermal: true,
    auto_respond: true,
  });
  return ok();
}

const command_data = new SlashCommandBuilder()
  .setName('reload')
  .setDescription('(DEV ONLY) reloads all commands');

const command: Command = {
  command_scope: RegistrationScope.DEVELOPMENT_SERVER,
  access_control: {
    developer_only: true,
  },
  command_data,
  run,
};

export default command;
