import { Response } from 'express';
import { Logger } from 'tslog';

export type TWResponse<TLocals extends Record<string, any> = {}, TBody = unknown> = Response<
  TBody,
  TLocals & { logger: Logger<unknown> }
>;
