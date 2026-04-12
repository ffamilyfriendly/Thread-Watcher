import { TypedPipelineModule } from '@watcher/shared';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { map_err } from '#/utilities/error';
import { DefaultModule, IPipeline, SupportedInteractionTypeWithGuild } from '../DefaultModule';
import { ValueContainer } from '../ValueContainter';

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
    if (!this.self.role_id) {
      this.l.silly("module not given 'role_id'. Skipping");
      return ok();
    }

    if (this.self.append) this.pipeline.assigned_roles.push(this.self.role_id);
    else this.pipeline.assigned_roles = [this.self.role_id];
    this.l.silly(
      `${this.self.append ? 'Appending to' : 'Replacing'} assigned roles with role '${this.self.role_id}'`,
    );

    const role_res = await ResultAsync.fromPromise(
      interaction.guild.roles.fetch(this.self.role_id),
      map_err,
    );
    if (role_res.isErr()) {
      this.l.error(`Could not fetch role`, role_res.error.message);
      return err(role_res.error);
    }
    if (!role_res.value) {
      this.l.warn(`Role '${this.self.role_id}' does not exist`);
      return err(new Error('no such role exists'));
    }

    this.exports.exports['role_id'] = role_res.value.id;
    this.exports.exports['role_name'] = role_res.value.name;

    return ok();
  }
}
