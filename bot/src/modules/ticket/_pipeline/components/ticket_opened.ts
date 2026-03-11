import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export function get_action_row(): ActionRowBuilder<ButtonBuilder> {
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

  row.addComponents(resolve_button, assign_button, note_button);

  return row;
}
