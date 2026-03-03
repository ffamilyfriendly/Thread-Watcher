import { TypedPipelineModule } from '@watcher/shared';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { map_err } from 'utilities/error';
import {
  DefaultModule,
  IPipeline,
  SupportedInteractionTypeWithGuild,
  ValueContainer,
} from '../base';

export default class AssignRole extends DefaultModule<TypedPipelineModule<'ASSIGN_ROLE'>> {
  constructor(self: TypedPipelineModule<'ASSIGN_ROLE'>, pipeline: IPipeline) {
    const exports = new ValueContainer(
      {
        role_id: self.role_id ?? null,
        role_name: null,
      },
      self.role_id ?? 'role_id',
    );

    super(self, pipeline, exports);
  }

  async run(interaction: SupportedInteractionTypeWithGuild): Promise<Result<void, Error>> {
    if (!this.self.role_id) return ok();

    if (this.self.append) this.pipeline.assigned_roles.push(this.self.role_id);
    else this.pipeline.assigned_roles = [this.self.role_id];

    const role_res = await ResultAsync.fromPromise(
      interaction.guild.roles.fetch(this.self.role_id),
      map_err,
    );
    if (role_res.isErr()) return err(role_res.error);
    if (!role_res.value) return err(new Error('no such role exists'));

    this.exports.exports['role_id'] = role_res.value.id;
    this.exports.exports['role_name'] = role_res.value.name;

    return ok();
  }
}
