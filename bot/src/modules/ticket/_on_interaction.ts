import { ticket_service } from '@providers/services/ticket_service';
import { ButtonInteraction, Interaction, StringSelectMenuInteraction } from 'discord.js';
import { ResultType } from 'interfaces/Module';
import { err, ok, Result } from 'neverthrow';
import { Logger } from 'tslog';
import { map_err } from 'utilities/error';
import { start_pipeline } from './_pipeline';
import mark_ticket_as_resolved from './_actions/mark_resolved';
import EmbeddableError from 'utilities/error/EmbeddableError';

function get_panel_id(id: string) {
  if (!id.startsWith('start:')) return null;
  return id.split('start:')[1];
}

function get_ticket_action(id: string) {
  const check_for = 'ticket:action:';
  if (!id.startsWith(check_for)) return null;
  return id.substring(check_for.length);
}

async function handle_panel_interaction(
  panel_id: string,
  interaction: Interaction,
  l: Logger<unknown>,
) {
  if (!interaction.isButton() && !interaction.isStringSelectMenu()) return ok();

  const panel = await ticket_service.get_panel(panel_id);
  if (panel.isErr()) return err(map_err(panel.error));

  if (!panel.value) {
    interaction.reply(`Panel \`${panel_id}\` was not found. Sorry :(`);
    return ok();
  }

  start_pipeline(panel.value, interaction, l);

  return ok();
}

export type ActionReturnType = Promise<Result<void | unknown, Error>>;

async function handle_ticket_action(
  action_name: string,
  interaction: Interaction,
  l: Logger<unknown>,
) {
  if (!interaction.isRepliable()) return ok();

  let result: ActionReturnType | null = null;
  switch (action_name) {
    case 'mark_resolved':
      result = mark_ticket_as_resolved(interaction);
  }

  if (result) {
    const res = await result;
    if (res.isErr()) return EmbeddableError.handle_error(interaction, res.error);
  }

  return ok();
}

export default async function on_interaction(
  interaction: Interaction,
  l: Logger<unknown>,
): ResultType {
  if (!('customId' in interaction)) return ok();

  const panel_id = get_panel_id(interaction.customId);
  if (panel_id) return handle_panel_interaction(panel_id, interaction, l);

  const ticket_action = get_ticket_action(interaction.customId);
  if (ticket_action) handle_ticket_action(ticket_action, interaction, l);

  return ok();
}
