import { config } from '@providers/config';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ColorResolvable,
  EmbedBuilder,
  Interaction,
  RepliableInteraction,
} from 'discord.js';
import i18next from 'i18next';
import { map_err } from '#/utilities/error';
import { safe_reply_or_followup } from '#/utilities/interaction_helpers';
import { strip_dangerous_strings } from './escape_sensitive_data';

export type I18nType = (
  key: string,
  options?: {
    [key: string]: unknown;
  },
) => string;

export default class EmbeddableError extends Error {
  protected doc_link?: string;
  protected embeds: EmbedBuilder[] = [];

  get doc_url(): `https://${string}` {
    return `https://docs.threadwatcher.xyz/common-issues/${this.doc_link}`;
  }

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
  }

  private get_base_embed(interaction: RepliableInteraction, t: I18nType): EmbedBuilder {
    const e = new EmbedBuilder();
    e.setColor(config.style.error.colour as ColorResolvable);
    e.setTitle(t('errors.fatal'));
    e.setTimestamp();
    e.setFooter({ text: `Interaction: ${interaction.id}` });

    return e;
  }

  private get_base_buttons(
    _interaction: RepliableInteraction,
    t: I18nType,
  ): ActionRowBuilder<ButtonBuilder> {
    const row = new ActionRowBuilder<ButtonBuilder>();

    const support_server_button = new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel(t('errors.get_help_btn_text'))
      .setEmoji('💬')
      .setURL(config.support_server_link);
    row.addComponents(support_server_button);

    if (this.doc_link) {
      const doc_link_button = new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel(t('errors.read_docs_btn_text'))
        .setEmoji('📖')
        .setURL(this.doc_url);
      row.addComponents(doc_link_button);
    }

    return row;
  }

  private get_i18n(interaction: Interaction): I18nType {
    return (key: string, options?: { [key: string]: unknown }) =>
      i18next.t(key, { lng: interaction.locale, ...options });
  }

  protected configure_embed(
    embed: EmbedBuilder,
    interaction: RepliableInteraction,
    t: I18nType,
  ): void {
    const escaped = strip_dangerous_strings(this.message);
    embed.setDescription(escaped.substring(0, 100));
  }

  protected configure_action_row(
    action_row: ActionRowBuilder<ButtonBuilder>,
    interaction: RepliableInteraction,
    t: I18nType,
  ): void {}

  public get_obj(interaction: RepliableInteraction): {
    embeds: EmbedBuilder[];
    components: ActionRowBuilder<ButtonBuilder>[];
    flags: 'Ephemeral';
  } {
    const t = this.get_i18n(interaction);
    const embed = this.get_base_embed(interaction, t);
    const buttons = this.get_base_buttons(interaction, t);
    this.configure_embed(embed, interaction, t);
    this.configure_action_row(buttons, interaction, t);
    this.embeds.unshift(embed);

    return {
      embeds: this.embeds,
      components: [buttons],
      flags: 'Ephemeral',
    };
  }

  public send_error(interaction: RepliableInteraction) {
    return safe_reply_or_followup(interaction, this.get_obj(interaction));
  }

  static from(error: unknown) {
    const as_err = map_err(error);
    if (as_err instanceof EmbeddableError) return as_err;
    else return new EmbeddableError(as_err.message);
  }

  static handle_error(interaction: RepliableInteraction, error: Error) {
    if (error instanceof EmbeddableError) {
      return error.send_error(interaction);
    }

    const as_embeddable_err = new EmbeddableError(error.message);
    return as_embeddable_err.send_error(interaction);
  }
}
