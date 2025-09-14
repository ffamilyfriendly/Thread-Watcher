import { logger, thread_service } from 'bot';
import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  ThreadChannel,
} from 'discord.js';

import {
  Command,
  CommandError,
  CommandExecutionContext,
  GuildChatInteraction,
  RegistrationScope,
} from 'interfaces/Command';
import { err, ok, Result } from 'neverthrow';

async function run(
  interaction: GuildChatInteraction,
  ctx: CommandExecutionContext,
): Promise<Result<void, CommandError>> {
  const filter = (interaction.options.getString('filter') ?? 'ALL') as
    | 'ALL'
    | 'THREADS'
    | 'CHANNELS';

  const response = await thread_service.get_detailed_thread(
    interaction.guildId,
    '1090279279595618454',
  );

  if (response.isErr()) return err(response.error);

  interaction.reply(`\`\`\`\n${JSON.stringify(response.value)}\n\`\`\``);

  return ok();
}

const command_data = new SlashCommandBuilder()
  .setName('list')
  .setDescription('List all watched threads, channels, or both')
  .addStringOption((o) =>
    o
      .addChoices([
        { name: 'All', value: 'ALL' },
        { name: 'Threads', value: 'THREADS' },
        { name: 'Channels', value: 'CHANNELS' },
      ])
      .setName('filter')
      .setDescription('Filter the list by type (default: All)'),
  )
  .addBooleanOption((o) =>
    o
      .setName('private')
      .setDescription('Hide the list from others (default: True, only you can see it)'),
  );

const command: Command = {
  command_scope: RegistrationScope.GLOBAL,
  access_control: {},
  command_data,
  run,
};

export default command;
