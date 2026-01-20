import { config } from '@providers/config';
import { guild_service } from '@providers/services/guild_service';
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { CommandError, RegistrationScope } from 'interfaces/BaseCommandInterface';
import { type Command } from 'interfaces/Command';
import { err, Result } from 'neverthrow';
import { CommandContext } from 'utilities/command_context';

async function run(
  interaction: ChatInputCommandInteraction,
  ctx: CommandContext,
): Promise<Result<void, CommandError>> {
  const guild_id = interaction.options.getString('guild_id', true);
  const sku_value = interaction.options.getString('sku', true);
  const sku = sku_value === 'NONE' ? null : sku_value;

  const r = await guild_service.set_guild_SKU(guild_id, sku);

  if (r.isErr()) return err(r.error);

  ctx.build_embed({
    title: 'Granted sku!',
    description: `gave sku \`${sku}\` to \`${guild_id}\``,
    style: 'success',
    ephermal: true,
    auto_respond: true,
  });

  return ctx.ok();
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
        { name: 'Extended', value: config.paywall.extended_sku },
        { name: 'Basic', value: config.paywall.basic_sku },
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
