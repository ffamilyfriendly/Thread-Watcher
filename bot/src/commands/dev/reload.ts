import { ipc_client } from '@providers/ipc/bot_ipc_client';
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { RegistrationScope } from 'interfaces/BaseCommandInterface';
import { CommandContext, type Command } from 'interfaces/Command';
import { Result } from 'neverthrow';
import { CommandError } from 'utilities/error/def';
import { safe_reply } from 'utilities/interaction_helpers';

function run(
  interaction: ChatInputCommandInteraction,
  ctx: CommandContext,
): Promise<Result<unknown, CommandError>> {
  ipc_client.send('reload', null);

  const embed = ctx.build_embed('success');
  embed
    .setTitle('Reloaded Commands!')
    .setDescription('Succesfully reloaded commands across all shards.');

  return safe_reply(interaction, { embeds: [embed], flags: 'Ephemeral' });
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
