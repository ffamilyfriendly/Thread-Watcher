import { PipelineModule } from '@watcher/shared';
import AssignRole from './modules/AssignRole';
import { err, ok, Result } from 'neverthrow';
import AssignChannel from './modules/AssignChannel';
import { DefaultModule, IPipeline } from './base';

type ModuleConstructor = new (self: any, pipeline: IPipeline) => DefaultModule<any>;

const MODULE_REGISTRY: Partial<Record<PipelineModule['type'], ModuleConstructor>> = {
  ASSIGN_ROLE: AssignRole,
  ASSIGN_CHANNEL: AssignChannel,
};

export function create_module(
  data: PipelineModule,
  pipeline: IPipeline,
): Result<DefaultModule<any>, Error> {
  const Constructor = MODULE_REGISTRY[data.type];

  if (!Constructor) {
    return err(new Error(`Module type ${data.type} is not registered in the factory`));
  }

  return ok(new Constructor(data, pipeline));
}
