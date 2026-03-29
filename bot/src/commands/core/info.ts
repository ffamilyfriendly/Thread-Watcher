import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';
import { RegistrationScope } from 'interfaces/BaseCommandInterface';
import { CommandContext, type Command } from 'interfaces/Command';
import { ok, Result } from 'neverthrow';
import { CommandError } from 'utilities/error/def';
import { safe_reply_or_followup } from 'utilities/interaction_helpers';

function run(
  interaction: ChatInputCommandInteraction,
  ctx: CommandContext,
): Promise<Result<unknown, CommandError>> {
  const embed = ctx.build_embed('info');
  embed.setTitle(ctx.t('commands.info.title'));
  embed.setDescription(ctx.t('commands.info.description'));

  const button_row = new ActionRowBuilder<ButtonBuilder>();
  const support_server_button = new ButtonBuilder();
  const website_link_button = new ButtonBuilder();

  website_link_button.setStyle(ButtonStyle.Link);
  website_link_button.setURL('https://threadwatcher.xyz');
  website_link_button.setLabel(ctx.t('commands.info.btn_website'));
  website_link_button.setEmoji('🌐');

  support_server_button.setStyle(ButtonStyle.Link);
  support_server_button.setURL('https://botsuite.co/join');
  support_server_button.setLabel(ctx.t('commands.info.btn_support'));
  support_server_button.setEmoji('🆘');

  button_row.addComponents(website_link_button, support_server_button);

  return safe_reply_or_followup(interaction, { embeds: [embed], components: [button_row] });
}

const command_data = new SlashCommandBuilder()
  .setName('info')
  .setDescription('get to know the bot and find out what it can do for you');

const command: Command = {
  command_scope: RegistrationScope.GLOBAL,
  access_control: {},
  command_data,
  run,
};

export default command;
