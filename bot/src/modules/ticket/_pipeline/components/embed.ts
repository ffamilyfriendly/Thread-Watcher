import { Embed } from '@watcher/shared';
import { ValueContainer } from '../base';
import { APIEmbedField, ColorResolvable, EmbedBuilder } from 'discord.js';
import { interpolate_string } from '../var_string';

export function generate_embed(embed_data: Embed, variables: ValueContainer): EmbedBuilder {
  const embed = new EmbedBuilder();
  embed.setTitle(interpolate_string(embed_data.title, variables));
  embed.setColor(embed_data.colour as ColorResolvable);
  if (embed_data.description)
    embed.setDescription(interpolate_string(embed_data.description, variables));

  for (const field of embed_data.fields) {
    const field_title = interpolate_string(field.text, variables);
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
