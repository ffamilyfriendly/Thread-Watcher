import { config } from '@providers/config';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export function get_action_row(ticket_id: string): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>();

  const resolve_button = new ButtonBuilder();
  resolve_button.setCustomId('ticket:action:mark_resolved');
  resolve_button.setStyle(ButtonStyle.Success);
  resolve_button.setLabel('Mark Resolved');
  resolve_button.setEmoji('✅');

  const assign_button = new ButtonBuilder();
  assign_button.setCustomId('ticket:action:claim_ticket');
  assign_button.setStyle(ButtonStyle.Primary);
  assign_button.setLabel('Claim Ticket');
  assign_button.setEmoji('🙋‍♂️');

  const note_button = new ButtonBuilder();
  note_button.setCustomId('ticket:action:add_note');
  note_button.setStyle(ButtonStyle.Secondary);
  note_button.setLabel('Add Note');
  note_button.setEmoji('📌');

  const open_online_button = new ButtonBuilder();
  open_online_button.setLabel('View Transcript');
  open_online_button.setEmoji('🌐');
  open_online_button.setURL(config.web.hostname + `/tickets/${ticket_id}`);
  open_online_button.setStyle(ButtonStyle.Link);

  row.addComponents(resolve_button, assign_button, note_button, open_online_button);

  return row;
}
