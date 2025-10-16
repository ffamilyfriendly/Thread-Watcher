import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Interaction,
  PermissionsBitField,
} from 'discord.js';
import { CommandError, PermissionsError } from 'interfaces/Command';
import { get_embed_function } from './embed';
import { logger } from 'bot';

function find_perm(permission: BigInt) {
  for (const perm of Object.keys(PermissionsBitField.Flags)) {
    const indexable_perms_lookup = PermissionsBitField.Flags as { [index: string]: bigint };
    if (indexable_perms_lookup[perm] === permission) return perm;
  }

  return 'Unknown Permission';
}

export function handle_error(
  interaction: ChatInputCommandInteraction,
  err: CommandError,
  docs_slug: string | null = null,
) {
  logger.error(`error encountered while handling interaction "${interaction.id}"`, err);
  const embed_builder = get_embed_function(interaction);

  const embed = embed_builder({
    title: '⚠️ Fatal Error',
    style: 'error',
    auto_respond: false,
  });

  let doc_link: string | null = docs_slug;

  embed.setFooter({
    text: `interaction ID: ${interaction.id}`,
  });

  if (err instanceof PermissionsError) {
    const target = err.whos_lackin === 'user' ? 'you have' : 'the bot has';

    embed.setDescription(
      `</${interaction.commandName}:${interaction.commandId}> requires that ${target} the \`${find_perm(err.missing_perm as bigint)}\` permission.`,
    );
    doc_link = 'discord-permissions';
  } else if ('message' in err && typeof err.message === 'string') {
    embed.setDescription(err.message);
  } else {
    embed.setDescription(`command failed without a clear cause.`);
  }

  const button_row = new ActionRowBuilder<ButtonBuilder>();
  const support_server_button = new ButtonBuilder();
  support_server_button.setStyle(ButtonStyle.Link);
  support_server_button.setURL('https://botsuite.co/join');
  support_server_button.setLabel('Support Server');
  button_row.addComponents(support_server_button);

  if (doc_link) {
    const documentation_link = new ButtonBuilder();
    documentation_link.setStyle(ButtonStyle.Link);
    documentation_link.setURL(`https://docs.threadwatcher.xyz/common-issues/${doc_link}`);
    documentation_link.setLabel('Learn More');
    button_row.addComponents(documentation_link);
  }

  if (interaction.replied) {
    interaction.editReply({ embeds: [embed], components: [button_row] });
  } else {
    interaction.reply({ embeds: [embed], flags: ['Ephemeral'], components: [button_row] });
  }
}

export function handle_error_generic(interaction: Interaction, err: CommandError) {
  const embed = new EmbedBuilder();

  embed.setFooter({
    text: `interaction ID: ${interaction.id}`,
  });

  if ('message' in err && typeof err.message === 'string') embed.setDescription(err.message);
  if ('title' in err && typeof err.title === 'string') embed.setTitle(err.title);

  const button_row = new ActionRowBuilder<ButtonBuilder>();
  const support_server_button = new ButtonBuilder();
  support_server_button.setStyle(ButtonStyle.Link);
  support_server_button.setURL('https://botsuite.co/join');
  support_server_button.setLabel('Support Server');
  button_row.addComponents(support_server_button);

  if ('docs_slug' in err && typeof err.docs_slug === 'string') {
    const documentation_link = new ButtonBuilder();
    documentation_link.setStyle(ButtonStyle.Link);
    documentation_link.setURL(`https://docs.threadwatcher.xyz/${err.docs_slug}`);
    documentation_link.setLabel('Learn More');
    button_row.addComponents(documentation_link);
  }

  if ('editReply' in interaction && interaction.replied) {
    interaction.editReply({ embeds: [embed], components: [button_row] });
  } else if (interaction.isRepliable()) {
    interaction.reply({ embeds: [embed], components: [button_row], flags: ['Ephemeral'] });
  }
}
