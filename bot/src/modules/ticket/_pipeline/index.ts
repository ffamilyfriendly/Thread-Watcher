import { TicketPanel } from '@watcher/shared';
import { ButtonInteraction, Guild, StringSelectMenuInteraction } from 'discord.js';
import { Pipeline } from './state';
import { SupportedInteractionType, SupportedInteractionTypeWithGuild } from './base';

export async function start_pipeline(panel: TicketPanel, interaction: SupportedInteractionType) {
  const pipeline = Pipeline.from(panel, interaction.user);

  let active_interaction: SupportedInteractionType = interaction;
  for (const module of pipeline.modules_arr) {
    const res = await module.run_module(active_interaction as SupportedInteractionTypeWithGuild);
    if (res.isErr()) {
      await interaction.editReply({
        content: `Pipeline failed at ${module.id}: ${res.error.message}`,
      });
      break;
    }

    // Switch out the active interaction (if applicable).
    // If we keep using the initial interaction we'll get "Unknown Interaction" errors
    if (res.value) active_interaction = res.value;
  }

  active_interaction.reply({ flags: 'Ephemeral', content: 'Hi :D' });
}
