import { config } from '@providers/config';
import { ButtonBuilder, ButtonStyle, ColorResolvable, EmbedBuilder } from 'discord.js';

export function get_default_embed(): EmbedBuilder {
  const e = new EmbedBuilder();
  e.setColor(config.style.info.colour as ColorResolvable);
  e.setTitle('Action Required');
  e.setDescription(
    'To proceed with the next step, please provide the requested details using the button below.',
  );
  e.setFooter({ text: 'Your input is required to complete this process' });

  return e;
}

export function get_default_proceed(): ButtonBuilder {
  const b = new ButtonBuilder();
  b.setStyle(ButtonStyle.Primary);
  b.setLabel('Open Form');
  b.setEmoji('📝');
  return b;
}

export function get_default_skip(): ButtonBuilder {
  const b = new ButtonBuilder();
  b.setStyle(ButtonStyle.Secondary);
  b.setLabel('Skip');
  b.setEmoji('⏩');
  return b;
}
