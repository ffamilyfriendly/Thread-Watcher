import { TypedPipelineModule } from '@watcher/shared';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { map_err } from 'utilities/error';
import { DefaultModule, IPipeline, SupportedInteractionTypeWithGuild } from '../DefaultModule';
import { ValueContainer } from '../ValueContainter';

export default class AssignChannel extends DefaultModule<TypedPipelineModule<'ASSIGN_CHANNEL'>> {
  private channel_id?: string;
  private channel_name?: string;

  constructor(self: TypedPipelineModule<'ASSIGN_CHANNEL'>, pipeline: IPipeline) {
    const exports = new ValueContainer(
      {
        role_id: () => this.channel_id ?? null,
        role_name: () => this.channel_name ?? null,
      },
      self.channel_id ?? 'channel_id',
    );
    super(self, pipeline, exports);
  }

  async run(interaction: SupportedInteractionTypeWithGuild): Promise<Result<void, Error>> {
    if (!this.self.channel_id) {
      this.l.silly("no 'channel_id' selected. Skipping");
      return ok();
    }

    this.l.silly(
      `Changing assigned channel: ${this.pipeline.assigned_channel} -> ${this.self.channel_id}`,
    );
    this.pipeline.assigned_channel = this.self.channel_id;

    const channel_res = await ResultAsync.fromPromise(
      interaction.guild.channels.fetch(this.self.channel_id),
      map_err,
    );
    if (channel_res.isErr()) {
      this.l.error(`Could not fetch channel with ID '${this.channel_id}'`, channel_res.error);
      return err(channel_res.error);
    }
    if (!channel_res.value) {
      this.l.error(`Channel with ID '${this.channel_id}' does not exist`);
      return err(new Error('no such channel exists'));
    }

    this.channel_id = channel_res.value.id;
    this.channel_name = channel_res.value.name;

    return ok();
  }
}
