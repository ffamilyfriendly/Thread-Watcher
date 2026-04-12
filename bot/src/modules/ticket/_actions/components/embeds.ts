import { config } from '@providers/config';
import { component_service } from '@providers/services/component_service';
import { Embed, Ticket } from '@watcher/shared';
import {
  ActionRowBuilder,
  APIUser,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ColorResolvable,
  EmbedBuilder,
  RepliableInteraction,
  User,
} from 'discord.js';
import { err, ok, Result } from 'neverthrow';
import { map_err } from '#/utilities/error';
import { safe_reply_or_followup } from '#/utilities/interaction_helpers';

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

export async function confirm_claim_ticket(
  interaction: RepliableInteraction,
  user: User,
): Promise<Result<{ should_continue: boolean; btn_interaction: ButtonInteraction }, Error>> {
  const e = base_embed();
  e.setDescription(`This ticket is already assigned.`);
  e.setFooter({ text: `If you claim this ticket ${user.username} will be un-assigned.` });
  e.setColor(config.style.warning.colour as ColorResolvable);
  e.setAuthor({ iconURL: user.displayAvatarURL(), name: user.username });
  const action_row = new ActionRowBuilder<ButtonBuilder>();

  const claim_btn_id = `_claim${crypto.randomUUID()}`;
  const cancel_btn_id = `_cancel${crypto.randomUUID()}`;

  const btn_claim = new ButtonBuilder()
    .setLabel('Claim')
    .setStyle(ButtonStyle.Danger)
    .setCustomId(claim_btn_id);
  const btn_cancel = new ButtonBuilder()
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary)
    .setCustomId(cancel_btn_id);
  action_row.addComponents(btn_claim, btn_cancel);

  const claim_promise = component_service.wait_for_interaction(
    btn_claim,
    (int) => int.user.id === interaction.user.id,
  );
  const cancel_promise = component_service.wait_for_interaction(
    btn_cancel,
    (int) => int.user.id === interaction.user.id,
  );

  const could_reply = await safe_reply_or_followup(interaction, {
    embeds: [e],
    components: [action_row],
    flags: 'Ephemeral',
  });
  if (could_reply.isErr()) return err(could_reply.error);

  const btn_resolved = await Promise.race([claim_promise, cancel_promise]);
  if (btn_resolved.isErr()) return err(map_err(btn_resolved.error));

  return ok({
    should_continue: btn_resolved.value.customId === claim_btn_id,
    btn_interaction: btn_resolved.value,
  });
}

export async function confirm_resolve_ticket(
  interaction: RepliableInteraction,
): Promise<Result<{ should_continue: boolean; btn_interaction: ButtonInteraction }, Error>> {
  const e = base_embed();
  e.setTitle('Resolve Ticket?');
  e.setDescription(`You are about to mark this ticket as **resolved**`);
  e.setFooter({ text: `This cannot be done.` });
  e.setColor(config.style.warning.colour as ColorResolvable);
  const action_row = new ActionRowBuilder<ButtonBuilder>();

  const resolve_btn_id = `_claim${crypto.randomUUID()}`;
  const cancel_btn_id = `_cancel${crypto.randomUUID()}`;

  const btn_resolve = new ButtonBuilder()
    .setLabel('Resolve')
    .setStyle(ButtonStyle.Primary)
    .setCustomId(resolve_btn_id);
  const btn_cancel = new ButtonBuilder()
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary)
    .setCustomId(cancel_btn_id);
  action_row.addComponents(btn_resolve, btn_cancel);

  const claim_promise = component_service.wait_for_interaction(
    btn_resolve,
    (int) => int.user.id === interaction.user.id,
  );
  const cancel_promise = component_service.wait_for_interaction(
    btn_cancel,
    (int) => int.user.id === interaction.user.id,
  );

  const could_reply = await safe_reply_or_followup(interaction, {
    embeds: [e],
    components: [action_row],
    flags: 'Ephemeral',
  });
  if (could_reply.isErr()) return err(could_reply.error);

  const btn_resolved = await Promise.race([claim_promise, cancel_promise]);
  if (btn_resolved.isErr()) return err(map_err(btn_resolved.error));

  return ok({
    should_continue: btn_resolved.value.customId === resolve_btn_id,
    btn_interaction: btn_resolved.value,
  });
}

export function new_claim_embed(user: APIUser | User, ticket: Ticket) {
  let icon_url: string;
  if (!('displayAvatarURL' in user)) {
    icon_url = 'http://example.com';
  } else {
    icon_url = user.displayAvatarURL();
  }
  const e = base_embed();
  e.setColor(config.style.success.colour as ColorResolvable);
  e.setAuthor({ iconURL: icon_url, name: user.username });
  e.setDescription('Assigned to this ticket!');

  return e;
}

export function get_ticket_resolved_buttons(ticket_id: string): ActionRowBuilder<ButtonBuilder> {
  const action_row = new ActionRowBuilder<ButtonBuilder>();

  const view_ticket_transcript = new ButtonBuilder();
  view_ticket_transcript.setLabel('View Transcript');
  view_ticket_transcript.setURL(`${config.web.hostname}/tickets/${ticket_id}`);
  view_ticket_transcript.setStyle(ButtonStyle.Link);
  action_row.addComponents(view_ticket_transcript);
  return action_row;
}

export const DEFAULT_EMBED: Embed = {
  title: `Ticket Resolved!`,
  description: `Your ticket, **{{env.name}}** (\`{{env.ID}}\`), was resolved.\nThread-Watcher could not fetch the panel (as it may have been deleted).`,
  fields: [],
  colour: config.style.warning.colour,
};
