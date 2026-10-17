import { TypedPipelineModule } from '@watcher/shared';
import { DefaultModule, IPipeline, SupportedInteractionTypeWithGuild } from '../DefaultModule';
import { err, ok, Result } from 'neverthrow';
import { ValueContainer } from '../ValueContainter';
import { ticket_service } from '@providers/services/ticket_service';

export default class Portal extends DefaultModule<TypedPipelineModule<'PORTAL'>> {
  constructor(self: TypedPipelineModule<'PORTAL'>, pipeline: IPipeline) {
    const exports = new ValueContainer({}, self.id);
    super(self, pipeline, exports);
  }

  protected async run(
    interaction: SupportedInteractionTypeWithGuild,
  ): Promise<Result<SupportedInteractionTypeWithGuild | void, Error>> {
    if (this.self.panel_id === this.pipeline.data.panel_id) {
      this.l.error(
        `Faulty configuration! Can't portal to '${this.self.panel_id}' as that is the active panel!`,
      );
      return err(new Error('Portal configuration error'));
    }

    const other_panel = await ticket_service.get_panel(this.self.panel_id);
    if (other_panel.isErr()) {
      this.l.error(`Failed to fetch panel with id '${this.self.panel_id}'!`);
      return err(other_panel.error);
    }

    if (other_panel.value.guild_id !== interaction.guildId) {
      this.l.error(`Panel with ID '${this.self.panel_id}' does not belong to this guild!`);
      return err(new Error(`Panel '${this.self.panel_id}' does not belong to this guild!`));
    }

    if (other_panel.value.commencement_method.type === 'SELECTION')
      this.l.warn(
        `Other panel configured to use StringSelect as opener... This might cause weird behaviour`,
      );

    this.l.info(
      `Fetched panel '${other_panel.value.name ?? '<unnamed>'}' (${other_panel.value.panel_id}). Swapping state!`,
    );

    const hotswap_res = this.pipeline.hotswap_panel(other_panel.value);
    if (hotswap_res.isErr()) {
      this.l.error(`Failed to portal to '${other_panel.value.panel_id}'! :(`);
      return err(hotswap_res.error);
    }

    return ok(interaction);
  }
}
