import { config } from '@providers/config';
import { logger } from '@providers/logger';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ColorResolvable,
  EmbedBuilder,
  Interaction,
  PermissionsBitField,
} from 'discord.js';
import i18next from 'i18next';
import { CommandError, EntitlementsError, PermissionsError } from 'interfaces/Command';

function find_perm(permission: BigInt) {
  for (const perm of Object.keys(PermissionsBitField.Flags)) {
    const indexable_perms_lookup = PermissionsBitField.Flags as { [index: string]: bigint };
    if (indexable_perms_lookup[perm] === permission) return perm;
  }

  return 'Unknown Permission';
}

export function handle_error(
  err: CommandError,
  interaction: ChatInputCommandInteraction,
  docs_slug: string | null = null,
) {
  const t = (key: string, options?: { [key: string]: unknown }) =>
    i18next.t(key, { lng: interaction.locale, ...options });
  logger.error(`error encountered while handling interaction "${interaction.id}"`, err);

  const embed = new EmbedBuilder({
    title: `⚠️ ${t('errors.fatal')}`,
  });
  embed.setColor(config.style.error.colour as ColorResolvable);

  let doc_link: string | null = docs_slug;

  embed.setFooter({
    text: `interaction ID: ${interaction.id}`,
  });

  const button_row = new ActionRowBuilder<ButtonBuilder>();
  const command_tag = `</${interaction.commandName}:${interaction.commandId}>`;
  if (err instanceof PermissionsError) {
    const target =
      err.whos_lackin === 'user'
        ? t('errors.permissions_err.you')
        : t('errors.permissions_err.bot');

    const permission = `\`${find_perm(err.missing_perm as bigint)}\``;

    embed.setDescription(
      t('errors.permissions_err.description', { command_tag, target, permission }),
    );
    doc_link = 'discord-permissions';
  }
  if (err instanceof EntitlementsError) {
    embed.setTitle(t('errors.entitlement_err.title'));
    embed.setColor(config.style.info.colour as ColorResolvable);
    const link = `https://discord.com/discovery/applications/${config.clientID}/store/${err.sku_id}`;

    const description = err.option_name
      ? t('errors.entitlement_err.command_option_requires_sku', {
          option_name: err.option_name,
          link,
        })
      : t('errors.entitlement_err.command_requires_sku', { command_tag, link });
    embed.setDescription(description);
    // does not work without SKU registered:
    //const sku_cta_button = new ButtonBuilder();
    //sku_cta_button.setStyle(ButtonStyle.Premium);
    //sku_cta_button.setSKUId(err.sku_id);
    //button_row.addComponents(sku_cta_button);
  } else if ('message' in err && typeof err.message === 'string') {
    embed.setDescription(err.message);
  } else {
    embed.setDescription(t('errors.permissions_err.failed_without_clear_cause'));
  }

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

  if (interaction.replied || interaction.deferred) {
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
