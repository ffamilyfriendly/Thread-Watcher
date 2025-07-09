import {
  ActionRow,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';
import { Command, CommandExecutionContext, RegistrationScope } from 'interfaces/Command';
import { ok, Result } from 'neverthrow';

function run(interaction: CommandInteraction, ctx: CommandExecutionContext): Result<void, unknown> {
  interaction.client.shard?.send({ type: 'reload' });

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
