import { Embed } from '@watcher/shared';
import {
  ActionRowBuilder,
  APIEmbedField,
  ButtonBuilder,
  ButtonStyle,
  ColorResolvable,
  EmbedBuilder,
} from 'discord.js';
import { interpolate_string } from '../helpers/var_string';
import { ValueContainer } from '../ValueContainter';
import { config } from '@providers/config';

export function generate_embed(embed_data: Embed, variables: ValueContainer): EmbedBuilder {
  const embed = new EmbedBuilder();
  embed.setTitle(interpolate_string(embed_data.title, variables));
  embed.setColor(embed_data.colour as ColorResolvable);
  if (embed_data.description)
    embed.setDescription(interpolate_string(embed_data.description, variables));

  for (const field of embed_data.fields) {
    const field_title = interpolate_string(field.title, variables);
    const field_text = interpolate_string(field.text, variables);
    const embed_field: APIEmbedField = {
      name: field_title,
      value: field_text,
      inline: field.is_inline ?? false,
    };

    embed.addFields(embed_field);
  }

  return embed;
}

export function create_ticket_opened(
  ticket_name: string,
  ticket_id: string,
  ticket_channel_link: string,
  uses_ai: boolean,
): [EmbedBuilder, ActionRowBuilder<ButtonBuilder>] {
  const embed = new EmbedBuilder();
  const row = new ActionRowBuilder<ButtonBuilder>();

  let description = `-# `;

  if (uses_ai) {
    description += `This ticket is summarized by AI, `;
  }

  description += `by talking in the ticket you agree with Thread-Watcher's [Terms](${config.web.hostname}/policies/terms-of-service) and [Privacy Policy](${config.web.hostname}/policies/privacy-policy)`;

  embed.setTitle(`Ticket Created`);
  embed.setColor(config.style.success.colour as ColorResolvable);
  embed.setDescription(description);
  embed.setFooter({ text: `Ticket ID: ${ticket_id}` });

  const open_ticket_btn = new ButtonBuilder();
  open_ticket_btn.setStyle(ButtonStyle.Link);
  open_ticket_btn.setLabel('Open Ticket');
  open_ticket_btn.setURL(ticket_channel_link);
  row.addComponents(open_ticket_btn);

  return [embed, row];
}

export function mistral_thinking_embed(e: EmbedBuilder) {
  e.setTitle('Thinking...');
  e.setDescription('Issue is being processed by Mistral Ai.');
}
