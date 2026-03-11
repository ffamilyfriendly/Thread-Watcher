import { config } from '@providers/config';
import {
  ActionRow,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ColorResolvable,
  EmbedBuilder,
  Interaction,
  RepliableInteraction,
} from 'discord.js';
import i18next from 'i18next';
import { safe_reply_or_followup } from 'utilities/interaction_helpers';

export type I18nType = (
  key: string,
  options?: {
    [key: string]: unknown;
  },
) => string;

export default class EmbeddableError extends Error {
  protected doc_link?: string;

  get doc_url(): `https://${string}` {
    return `https://docs.threadwatcher.xyz/common-issues/${this.doc_link}`;
  }

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
  }

  private get_base_embed(): EmbedBuilder {
    const e = new EmbedBuilder();
    e.setColor(config.style.error.colour as ColorResolvable);
    e.setTitle('Something went wrong');
    e.setTimestamp();

    return e;
  }

  private get_base_buttons(): ActionRowBuilder<ButtonBuilder> {
    const row = new ActionRowBuilder<ButtonBuilder>();

    const support_server_button = new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel('Get Help')
      .setEmoji('💬')
      .setURL(config.support_server_link);
    row.addComponents(support_server_button);

    if (this.doc_link) {
      const doc_link_button = new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel('Read More')
        .setEmoji('📖')
        .setURL(this.doc_url);
      row.addComponents(doc_link_button);
    }

    return row;
  }

  protected get_i18n(interaction: Interaction): I18nType {
    return (key: string, options?: { [key: string]: unknown }) =>
      i18next.t(key, { lng: interaction.locale, ...options });
  }

  protected configure_embed(
    embed: EmbedBuilder,
    interaction: RepliableInteraction,
    t: I18nType,
  ): void {
    embed.setDescription(this.message);
  }

  protected configure_action_row(
    action_row: ActionRowBuilder<ButtonBuilder>,
    interaction: RepliableInteraction,
    t: I18nType,
  ): void {}

  public send_error(interaction: RepliableInteraction) {
    const t = this.get_i18n(interaction);
    const embed = this.get_base_embed();
    const buttons = this.get_base_buttons();
    this.configure_embed(embed, interaction, t);
    this.configure_action_row(buttons, interaction, t);
    return safe_reply_or_followup(interaction, {
      embeds: [embed],
      components: [buttons],
      flags: 'Ephemeral',
    });
  }

  static handle_error(interaction: RepliableInteraction, error: Error) {
    if (error instanceof EmbeddableError) {
      return error.send_error(interaction);
    }

    const as_embeddable_err = new EmbeddableError(error.message);
    return as_embeddable_err.send_error(interaction);
  }
}
