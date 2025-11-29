import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { ipc_client } from 'bot';
import { Command, CommandError, RegistrationScope } from 'interfaces/Command';
import { ok, Result } from 'neverthrow';
import { CommandContext } from 'utilities/command_context';

function run(
  interaction: ChatInputCommandInteraction,
  ctx: CommandContext,
): Result<void, CommandError> {
  ipc_client.send('reload', null);

  ctx.build_embed({
    title: 'reloaded commands!',
    description: 'actually works???',
    style: 'success',
    ephermal: true,
    auto_respond: true,
  });

  return ctx.ok();
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
