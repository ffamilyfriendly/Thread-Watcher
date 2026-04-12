import { guild_service } from '@providers/services/guild_service';
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { RegistrationScope } from '#/interfaces/BaseCommandInterface';
import { CommandContext, type Command } from '#/interfaces/Command';
import { err, Result } from 'neverthrow';
import { CommandError } from '#/utilities/error/def';
import { safe_reply } from '#/utilities/interaction_helpers';

async function run(
  interaction: ChatInputCommandInteraction,
  ctx: CommandContext,
): Promise<Result<unknown, CommandError>> {
  const guild_id = interaction.options.getString('guild_id', true);
  const eur_amount = interaction.options.getNumber('cost', true);
  const micro_eurocents = Math.round(eur_amount * 100 * 10_000);

  const r = await guild_service.set_persistent_ai_tokens(guild_id, micro_eurocents);

  if (r.isErr()) return err(r.error);

  const embed = ctx.build_embed('success');
  embed.setTitle('Granted Tokens!');
  embed.setDescription(
    `Set persistent AI budget to \`€${eur_amount.toFixed(4)}\` (\`${micro_eurocents}\` eurocents) for guild \`${guild_id}\``,
  );

  return safe_reply(interaction, { embeds: [embed], flags: 'Ephemeral' });
}

const command_data = new SlashCommandBuilder()
  .setName('set-persistent-tokens')
  .setDescription('(DEV ONLY) set persistent AI tokens of a guild')
  .addStringOption((o) => o.setName('guild_id').setDescription('id of guild').setRequired(true))
  .addNumberOption((o) =>
    o
      .setName('cost')
      .setDescription('the cost (in EUR) you are giving to the server')
      .setRequired(true),
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
