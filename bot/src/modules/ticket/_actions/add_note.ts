import {
  ColorResolvable,
  ModalBuilder,
  ModalSubmitInteraction,
  RepliableInteraction,
  TextInputStyle,
} from 'discord.js';
import { ActionReturnType } from '../_on_interaction';
import { err, ok, ResultAsync } from 'neverthrow';
import { Ticket } from '@watcher/shared';
import { map_err } from 'utilities/error';
import { component_service } from '@providers/services/component_service';
import { member_has_role_overlap } from './shared';
import { safe_reply, safe_update } from 'utilities/interaction_helpers';
import { ticket_service } from '@providers/services/ticket_service';
import { delete_note_btn, note_inserted } from './components/embeds';
import EmbeddableError from 'utilities/error/EmbeddableError';
import { config } from '@providers/config';

export default async function add_note_action(
  int: RepliableInteraction,
  ticket: Ticket,
): ActionReturnType {
  if (int instanceof ModalSubmitInteraction)
    return err(new Error('this function cannot be ran with ModalSubmitInteraction'));
  if (!int.member) return err(new Error('member object required'));
  if (!member_has_role_overlap(int.member, ticket.assigned_to_roles))
    return err(new Error('you cannot do that'));

  const modal = new ModalBuilder();
  modal.setTitle(`Add note for ${ticket.name}`);

  modal.addLabelComponents((lbl) =>
    lbl
      .setLabel('Note')
      .setTextInputComponent((ti) =>
        ti
          .setCustomId('note_val')
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(100)
          .setMinLength(5),
      ),
  );

  const modal_res_ans = component_service.wait_for_interaction(
    modal,
    (int2) => int2.user.id === int.user.id,
  );

  const show_modal = await ResultAsync.fromPromise(int.showModal(modal), map_err);
  if (show_modal.isErr()) return err(show_modal.error);

  const modal_res = await modal_res_ans;
  if (modal_res.isErr()) return err(map_err(modal_res.error));

  const note_text = modal_res.value.fields.getTextInputValue('note_val');

  const note_created = await ticket_service.insert_ticket_note({
    text: note_text,
    ticket_id: ticket.ticket_id,
    created_by: int.user.id,
  });

  if (note_created.isErr()) return err(map_err(note_created.error));

  const embed = note_inserted(int.user, note_text, ticket);

  const delete_row = delete_note_btn(int.user.id, async (btn_int) => {
    const delete_res = await ticket_service.delete_ticket_note(note_created.value);
    if (delete_res.isErr()) {
      return EmbeddableError.handle_error(btn_int, map_err(delete_res.error));
    }

    embed.setColor(config.style.error.colour as ColorResolvable);
    embed.setFooter({ text: 'Note Deleted!' });

    return safe_update(btn_int, { components: [], embeds: [embed] });
  });

  safe_reply(modal_res.value, {
    embeds: [embed],
    components: [delete_row],
    flags: 'Ephemeral',
  });

  return ok();
}
