import { ticket_service } from '@providers/services/ticket_service';
import { ButtonInteraction, Interaction, StringSelectMenuInteraction } from 'discord.js';
import { ResultType } from 'interfaces/Module';
import { err, ok } from 'neverthrow';
import { Logger } from 'tslog';
import { map_err } from 'utilities/error';
import { start_pipeline } from './_pipeline';

function get_panel_id(id: string) {
  if (!id.startsWith('start:')) return null;
  return id.split('start:')[1];
}

export default async function on_interaction(
  interaction: Interaction,
  l: Logger<unknown>,
): ResultType {
  if (!interaction.isButton() && !interaction.isStringSelectMenu()) return ok();
  const panel_id = get_panel_id(interaction.customId);
  if (!panel_id) return ok();

  const panel = await ticket_service.get_panel(panel_id);
  if (panel.isErr()) return err(map_err(panel.error));

  if (!panel.value) {
    interaction.reply(`Panel \`${panel_id}\` was not found. Sorry :(`);
    return ok();
  }

  start_pipeline(panel.value, interaction, l);

  return ok();
}
