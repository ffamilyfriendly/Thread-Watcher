import { PipelineModule } from '@watcher/shared';
import AssignRole from '../modules/AssignRole';
import { err, ok, Result } from 'neverthrow';
import AssignChannel from '../modules/AssignChannel';
import { DefaultModule, IPipeline } from '../DefaultModule';
import IssueNarrower from '../modules/IssueNarrower';
import ModalQuestion from '../modules/ModalQuestion';
import OpenTicket from '../modules/OpenTicket';
import AssignName from '../modules/AssignName';
import SilentResolve from '../modules/ResolveSilently';

type ModuleConstructor = new (self: any, pipeline: IPipeline) => DefaultModule<any>;

const MODULE_REGISTRY: Omit<
  Record<PipelineModule['type'], ModuleConstructor>,
  'ROOT_ENV_MODULE'
> = {
  ASSIGN_ROLE: AssignRole,
  ASSIGN_CHANNEL: AssignChannel,
  NARROW_ISSUE: IssueNarrower,
  MODAL_QUESTION: ModalQuestion,
  OPEN_TICKET: OpenTicket,
  ASSIGN_NAME: AssignName,
  SILENT_RESOLVE: SilentResolve,
};

export function create_module(
  data: PipelineModule,
  pipeline: IPipeline,
): Result<DefaultModule<any>, Error> {
  if (data.type === 'ROOT_ENV_MODULE') return err(new Error("Tried creating 'ROOT_ENV_MODULE'"));
  const Constructor = MODULE_REGISTRY[data.type];

  if (!Constructor) {
    return err(new Error(`Module type ${data.type} is not registered in the factory`));
  }

  return ok(new Constructor(data, pipeline));
}
