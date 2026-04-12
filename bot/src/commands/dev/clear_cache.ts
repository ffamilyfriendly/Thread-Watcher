import { redis } from '@providers/redis';
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { RegistrationScope } from '#/interfaces/BaseCommandInterface';
import { CommandContext, type Command } from '#/interfaces/Command';
import { err, Result, ResultAsync } from 'neverthrow';
import { CommandError } from '#/utilities/error/def';
import { safe_reply } from '#/utilities/interaction_helpers';

async function run(
  interaction: ChatInputCommandInteraction,
  ctx: CommandContext,
): Promise<Result<unknown, CommandError>> {
  const key_to_remove = interaction.options.getString('key');
  let action_result;

  if (key_to_remove) {
    action_result = await ResultAsync.fromPromise(redis.del(key_to_remove), (e) =>
      e instanceof Error ? e : new Error('something went wrong'),
    );
  } else {
    action_result = await ResultAsync.fromPromise(redis.flushall(), (e) =>
      e instanceof Error ? e : new Error('something went wrong'),
    );
  }

  if (action_result.isErr()) return err(action_result.error);

  const embed = ctx.build_embed('success');
  embed.setTitle('Cleared Cache');
  embed.setDescription(key_to_remove ? `removed \`${key_to_remove}\` from cache` : 'flushed cache');

  return safe_reply(interaction, { embeds: [embed], flags: 'Ephemeral' });
}

const command_data = new SlashCommandBuilder()
  .setName('clear-cache')
  .setDescription('(DEV ONLY) clears redis cache')
  .addStringOption((o) =>
    o.setName('key').setDescription('the key to remove (Default: flush all)'),
  );

const command: Command = {
  command_scope: RegistrationScope.DEVELOPMENT_SERVER,
  access_control: {
    developer_only: true,
  },
  command_data,
  run,
};

export default command;
