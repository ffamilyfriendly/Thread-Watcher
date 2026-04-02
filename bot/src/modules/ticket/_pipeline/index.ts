import { TicketPanel } from '@watcher/shared';
import { Pipeline } from './Pipeline';
import { SupportedInteractionType, SupportedInteractionTypeWithGuild } from './DefaultModule';
import { err, ResultAsync } from 'neverthrow';
import { map_err } from 'utilities/error';
import { Logger } from 'tslog';
import { ModalSubmitInteraction } from 'discord.js';

export async function start_pipeline(
  panel: TicketPanel,
  interaction: SupportedInteractionType,
  l: Logger<unknown>,
) {
  const pipeline = Pipeline.from(panel);

  // This will never happen as the only way to trigger a pipeline is thru either a StringSelect or Button
  if (interaction instanceof ModalSubmitInteraction)
    return err(
      new Error('Pipeline was triggered thru a modal submit interaction and cannot be processed'),
    );

  ResultAsync.fromPromise(
    interaction.message.edit({ components: interaction.message.components }),
    map_err,
  ).then((edit_res) => {
    if (edit_res.isErr()) l.warn('Could not edit message to clear selection', edit_res.error);
  });

  const pipeline_population_res = await pipeline.populate_value_container(interaction);
  if (pipeline_population_res.isErr()) {
    l.error('could not populate pipeline values', pipeline_population_res.error);
    return err(pipeline_population_res.error);
  }

  let active_interaction: SupportedInteractionType = interaction;
  for (const module of pipeline.modules_arr) {
    const res = await module.run_module(active_interaction as SupportedInteractionTypeWithGuild);

    if (res.isErr()) {
      return pipeline.handle_error(active_interaction, module.id, res.error);
    }

    // Switch out the active interaction (if applicable).
    // If we keep using the initial interaction we'll get "Unknown Interaction" errors
    if (res.value) active_interaction = res.value;
    if (pipeline.resolved) {
      pipeline.logger.info(`Pipeline resolved on Module '${module.id}'!`);
      break;
    }
  }

  if (!pipeline.resolved) {
    return pipeline.handle_error(
      active_interaction,
      'PIPELINE',
      new Error('Pipeline exited without resolving.'),
    );
  }
}
