import { TicketPanel } from '@watcher/shared';
import { Pipeline } from './Pipeline';
import { SupportedInteractionType, SupportedInteractionTypeWithGuild } from './DefaultModule';
import { err, ResultAsync } from 'neverthrow';
import { map_err } from 'utilities/error';
import { Logger } from 'tslog';

export async function start_pipeline(
  panel: TicketPanel,
  interaction: SupportedInteractionType,
  l: Logger<unknown>,
) {
  const pipeline = Pipeline.from(panel, interaction);

  ResultAsync.fromPromise(
    interaction.message.edit({ components: interaction.message.components }),
    map_err,
  ).then((edit_res) => {
    if (edit_res.isErr()) l.warn('Could not edit message to clear selection', edit_res.error);
  });

  const def_await = await ResultAsync.fromPromise(
    interaction.deferReply({ flags: 'Ephemeral' }),
    map_err,
  );
  if (def_await.isErr()) {
    l.error('could not defer interaction', def_await.error);
    return err(def_await.error);
  }

  let active_interaction: SupportedInteractionType = interaction;
  for (const module of pipeline.modules_arr) {
    const res = await module.run_module(active_interaction as SupportedInteractionTypeWithGuild);

    if (res.isErr()) {
      pipeline.resolve_error(active_interaction, module, res.error);
      break;
    }

    // Switch out the active interaction (if applicable).
    // If we keep using the initial interaction we'll get "Unknown Interaction" errors
    if (res.value) active_interaction = res.value;
  }

  await pipeline.resolve_ticket(active_interaction);
}
