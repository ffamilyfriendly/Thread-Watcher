import { config } from '@providers/config';
import { component_service } from '@providers/services/component_service';
import { Ticket } from '@watcher/shared';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ColorResolvable,
  EmbedBuilder,
  User,
} from 'discord.js';

function base_embed(): EmbedBuilder {
  const e = new EmbedBuilder();
  e.setColor(config.style.info.colour as ColorResolvable);

  return e;
}

export function note_inserted(user: User, note_text: string, ticket: Ticket) {
  const e = base_embed();
  e.setAuthor({ name: user.username, iconURL: user.displayAvatarURL() });
  e.setDescription(note_text);
  e.setFooter({ text: `ticket: ${ticket.ticket_id}` });

  return e;
}

export function delete_note_btn(user_id: string, on_click: (int: ButtonInteraction) => void) {
  const action_row = new ActionRowBuilder<ButtonBuilder>();
  const del_btn = new ButtonBuilder();
  del_btn.setStyle(ButtonStyle.Danger);
  del_btn.setLabel('Delete Note');
  del_btn.setEmoji('🗑️');
  component_service.wait_for_interaction_callback(
    del_btn,
    (int) => int.user.id === user_id,
    on_click,
  );
  action_row.addComponents(del_btn);
  return action_row;
}
