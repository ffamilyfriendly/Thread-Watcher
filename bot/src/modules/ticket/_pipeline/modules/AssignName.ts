import { TypedPipelineModule } from '@watcher/shared';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { map_err } from 'utilities/error';
import { DefaultModule, IPipeline, SupportedInteractionTypeWithGuild } from '../DefaultModule';
import { ValueContainer } from '../ValueContainter';

export default class AssignName extends DefaultModule<TypedPipelineModule<'ASSIGN_NAME'>> {
  private channel_id?: string;
  private channel_name?: string;

  constructor(self: TypedPipelineModule<'ASSIGN_NAME'>, pipeline: IPipeline) {
    const exports = new ValueContainer({}, self.new_name ?? 'name');
    super(self, pipeline, exports);
  }

  async run(interaction: SupportedInteractionTypeWithGuild): Promise<Result<void, Error>> {
    if (!this.self.new_name) {
      this.l.silly("no 'new_name' selected. Skipping");
      return ok();
    }

    this.l.silly(`Changing assigned name: ${this.pipeline.ticket_name} -> ${this.self.new_name}`);

    this.pipeline.name = this.self.new_name;

    return ok();
  }
}
