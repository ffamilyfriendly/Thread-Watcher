import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ColorResolvable,
  CommandInteraction,
  EmbedBuilder,
  PermissionResolvable,
  PermissionsBitField,
  RepliableInteraction,
} from 'discord.js';
import { DatabaseError } from '../def';
import EmbeddableError, { I18nType } from '../EmbeddableError';
import { config } from '@providers/config';

function find_perm(permission: BigInt) {
  for (const perm of Object.keys(PermissionsBitField.Flags)) {
    const indexable_perms_lookup = PermissionsBitField.Flags as { [index: string]: bigint };
    if (indexable_perms_lookup[perm] === permission) return perm;
  }

  return 'Unknown Permission';
}

type LacksPermission = 'bot' | 'user';

export class PermissionsError extends EmbeddableError {
  configure_action_row(
    action_row: ActionRowBuilder<ButtonBuilder>,
    interaction: RepliableInteraction,
    t: I18nType,
  ): void {}
  configure_embed(embed: EmbedBuilder, interaction: RepliableInteraction, t: I18nType): void {
    const command_tag =
      interaction instanceof CommandInteraction
        ? `</${interaction.commandName}:${interaction.commandId}>`
        : `<unknown command>`;

    const target =
      this.whos_lackin === 'user'
        ? t('errors.permissions_err.you')
        : t('errors.permissions_err.bot');

    const permission = `\`${find_perm(this.missing_perm as bigint)}\``;

    embed.setDescription(
      t('errors.permissions_err.description', { command_tag, target, permission }),
    );
  }

  missing_perm: PermissionResolvable;
  whos_lackin: LacksPermission;

  constructor(required_permission: PermissionResolvable, whos_lackin: LacksPermission = 'user') {
    super(`${whos_lackin} is missing the perm ${required_permission}`);
    this.name = 'PermissionsError';
    this.missing_perm = required_permission;
    this.whos_lackin = whos_lackin;
  }
}

export class GenericCommandError extends EmbeddableError {
  title: string;
  message: string;
  docs_slug?: string;

  constructor(title: string, message: string, docs_slug?: string) {
    super(message);
    this.title = title;
    this.message = message;
    this.docs_slug = docs_slug;
  }
}

export class EntitlementsError extends EmbeddableError {
  sku_id: string;
  option_name?: string;

  constructor(sku_id: string, option?: string) {
    super(`Proceeding requires SKU ${sku_id}`);
    this.option_name = option;
    this.sku_id = sku_id;
  }

  protected configure_action_row(
    action_row: ActionRowBuilder<ButtonBuilder>,
    interaction: RepliableInteraction,
    t: I18nType,
  ): void {
    const IS_DEV_ENV = true;
    if (!IS_DEV_ENV) {
      const sku_cta_button = new ButtonBuilder();
      sku_cta_button.setStyle(ButtonStyle.Premium);
      sku_cta_button.setSKUId(this.sku_id);
      action_row.setComponents(sku_cta_button);
    }
  }

  protected configure_embed(
    embed: EmbedBuilder,
    interaction: RepliableInteraction,
    t: I18nType,
  ): void {
    const command_tag =
      interaction instanceof CommandInteraction
        ? `</${interaction.commandName}:${interaction.commandId}>`
        : `<unknown command>`;
    embed.setTitle(t('errors.entitlement_err.title'));
    embed.setColor(config.style.info.colour as ColorResolvable);
    const link = `https://discord.com/discovery/applications/${config.clientID}/store/${this.sku_id}`;

    const description = this.option_name
      ? t('errors.entitlement_err.command_option_requires_sku', {
          option_name: this.option_name,
          link,
        })
      : t('errors.entitlement_err.command_requires_sku', { command_tag, link });
    embed.setDescription(description);
  }
}

export type CommandError = DatabaseError | PermissionsError | GenericCommandError;
