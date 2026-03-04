import { TypedPipelineModule } from '@watcher/shared';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { map_err } from 'utilities/error';
import {
  DefaultModule,
  IPipeline,
  SupportedInteractionTypeWithGuild,
  ValueContainer,
} from '../base';

export default class GenerateAnswer extends DefaultModule<TypedPipelineModule<'GENERATE_ANSWER'>> {
  readonly prompt_res?: string;

  constructor(self: TypedPipelineModule<'GENERATE_ANSWER'>, pipeline: IPipeline) {
    const exports = new ValueContainer(
      {
        answer: () => this.prompt_res ?? null,
      },
      self.prompt ?? null,
    );

    super(self, pipeline, exports);
  }

  async run(interaction: SupportedInteractionTypeWithGuild): Promise<Result<void, Error>> {
    this.l.warn('this will fail intentionally!');

    return err(new Error('we are failing with grace fr'));

    return ok();
  }
}
