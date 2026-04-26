import { client } from '@providers/client';
import { thread_service } from '@providers/services/thread_service';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';
import { RegistrationScope } from '#/interfaces/BaseCommandInterface';
import { CommandContext, type Command } from '#/interfaces/Command';
import { ok, Result, ResultAsync } from 'neverthrow';
import { map_err } from '#/utilities/error';
import { CommandError } from '#/utilities/error/def';
import { safe_reply_or_followup } from '#/utilities/interaction_helpers';

async function run(
  interaction: ChatInputCommandInteraction,
  ctx: CommandContext,
): Promise<Result<unknown, CommandError>> {
  const watched_threads = (await thread_service.get_count_threads()).unwrapOr(0);

  const guild_count_res = await ResultAsync.fromPromise(
    client.shard?.fetchClientValues('guilds.cache.size') ?? Promise.resolve([0]),
    map_err,
  );
  const guild_count = guild_count_res.isOk()
    ? (guild_count_res.value as number[]).reduce((a, b) => a + b, 0)
    : 0;

  const shard_id = client.shard?.ids.join(',') ?? '<unknown>';
  const shard_count = client.shard?.count ?? 1;

  const embed = ctx.build_embed('info');
  embed.setTitle(ctx.t('commands.info.title'));
  embed.setDescription(
    ctx.t('commands.info.description', {
      watched_threads,
      guild_count,
      shard_id,
      shard_count,
      guild_id: interaction.guildId!,
    }),
  );

  const button_row = new ActionRowBuilder<ButtonBuilder>();

  const website_link_button = new ButtonBuilder()
    .setStyle(ButtonStyle.Link)
    .setURL('https://threadwatcher.xyz')
    .setLabel(ctx.t('commands.info.btn_website'))
    .setEmoji('🌐');

  const support_server_button = new ButtonBuilder()
    .setStyle(ButtonStyle.Link)
    .setURL('https://botsuite.co/join')
    .setLabel(ctx.t('commands.info.btn_support'))
    .setEmoji('🆘');

  button_row.addComponents(website_link_button, support_server_button);

  return safe_reply_or_followup(interaction, {
    embeds: [embed],
    components: [button_row],
    flags: 'Ephemeral',
  });
}

const command_data = new SlashCommandBuilder()
  .setName('info')
  .setDescription('Learn about Thread-Watcher');

const command: Command = {
  command_scope: RegistrationScope.GLOBAL,
  access_control: {},
  command_data,
  run,
};

export default command;
