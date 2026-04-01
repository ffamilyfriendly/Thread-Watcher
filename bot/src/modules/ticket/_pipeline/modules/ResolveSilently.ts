import { TypedPipelineModule } from '@watcher/shared';
import { DefaultModule, IPipeline, SupportedInteractionTypeWithGuild } from '../DefaultModule';
import { ValueContainer } from '../ValueContainter';
import { err, ok, Result } from 'neverthrow';
import { generate_embed } from '../components/embed';
import { safe_reply_or_followup } from 'utilities/interaction_helpers';

export default class SilentResolve extends DefaultModule<TypedPipelineModule<'SILENT_RESOLVE'>> {
  constructor(self: TypedPipelineModule<'SILENT_RESOLVE'>, pipeline: IPipeline) {
    const exports = new ValueContainer({}, self.id);
    super(self, pipeline, exports);
  }

  protected async run(
    interaction: SupportedInteractionTypeWithGuild,
  ): Promise<Result<SupportedInteractionTypeWithGuild | void, Error>> {
    const embed = generate_embed(this.self.embed, this.pipeline.exports);
    embed.setFooter({ text: 'This ticket is now resolved.' });

    const could_reply = await safe_reply_or_followup(interaction, {
      embeds: [embed],
      flags: 'Ephemeral',
    });
    if (could_reply.isErr()) return err(could_reply.error);
    this.l.info('Ticket resolved silently!');

    this.pipeline.start_ticket_silently();

    return ok();
  }
}
