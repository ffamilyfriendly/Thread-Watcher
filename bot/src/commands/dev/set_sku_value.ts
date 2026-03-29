import { config } from '@providers/config';
import { guild_service } from '@providers/services/guild_service';
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { RegistrationScope } from 'interfaces/BaseCommandInterface';
import { CommandContext, type Command } from 'interfaces/Command';
import { err, Result } from 'neverthrow';
import { CommandError } from 'utilities/error/def';
import { safe_reply } from 'utilities/interaction_helpers';

async function run(
  interaction: ChatInputCommandInteraction,
  ctx: CommandContext,
): Promise<Result<unknown, CommandError>> {
  const guild_id = interaction.options.getString('guild_id', true);
  const sku_value = interaction.options.getString('sku', true);
  const sku = sku_value === 'NONE' ? null : sku_value;

  const r = await guild_service.set_guild_SKU(guild_id, sku);

  if (r.isErr()) return err(r.error);

  const embed = ctx.build_embed('success');
  embed.setTitle('Granted SKU!');
  embed.setDescription(`gave sku \`${sku}\` to \`${guild_id}\``);
  return safe_reply(interaction, { embeds: [embed], flags: 'Ephemeral' });
}

const command_data = new SlashCommandBuilder()
  .setName('set-sku')
  .setDescription('(DEV ONLY) set SKU value for a guild')
  .addStringOption((o) => o.setName('guild_id').setDescription('id of guild').setRequired(true))
  .addStringOption((o) =>
    o
      .setName('sku')
      .setDescription('the SKU you want to grant')
      .setChoices([
        { name: 'Premium', value: config.paywall.basic_sku },
        { name: 'None', value: 'NONE' },
      ])
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
