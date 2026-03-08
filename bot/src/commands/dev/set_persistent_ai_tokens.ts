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
  const tokens_amount = interaction.options.getNumber('tokens', true);

  const r = await guild_service.set_persistent_ai_tokens(guild_id, tokens_amount);

  if (r.isErr()) return err(r.error);

  ctx.build_embed({
    title: 'Granted tokens!',
    description: `set persistent tokens to \`${tokens_amount}\` for guild \`${guild_id}\``,
    style: 'success',
    ephermal: true,
    auto_respond: true,
  });

  return ctx.ok();
}

const command_data = new SlashCommandBuilder()
  .setName('set-persistent-tokens')
  .setDescription('(DEV ONLY) set persistent AI tokens of a guild')
  .addStringOption((o) => o.setName('guild_id').setDescription('id of guild').setRequired(true))
  .addNumberOption((o) =>
    o.setName('tokens').setDescription('the tokens you want to grant').setRequired(true),
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
