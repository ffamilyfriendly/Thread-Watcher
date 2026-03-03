import { BaseModule, TypedPipelineModule } from '@watcher/shared';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { client } from '@providers/client';
import { map_err } from 'utilities/error';
import {
  DefaultModule,
  IPipeline,
  SupportedInteractionTypeWithGuild,
  ValidPropertyReturn,
  ValueContainer,
} from '../base';

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
    if (!this.self.channel_id) return ok();

    this.pipeline.assigned_channel = this.self.channel_id;

    const channel_res = await ResultAsync.fromPromise(
      interaction.guild.channels.fetch(this.self.channel_id),
      map_err,
    );
    if (channel_res.isErr()) return err(channel_res.error);
    if (!channel_res.value) return err(new Error('no such channel exists'));

    this.channel_id = channel_res.value.id;
    this.channel_name = channel_res.value.name;

    return ok();
  }

  get_property(id: string[]): ValidPropertyReturn {
    if (id.shift() !== 'channel') return null;
    const prop_name = id.shift();
    if (prop_name === 'id') return this.channel_id ?? null;
    else return this.channel_name ?? null;
  }
}
