import { Result } from 'neverthrow';
import { TWResponse } from './utils/logging';
import { NextFunction, Request } from 'express';
import { global_error_handler } from './utils/error';
import z from 'zod';
import { pretty_print_request_info } from './auth/auth';
import { config } from '@providers/config';

export function safe_route<
  TOut = unknown,
  TBodySchema extends z.ZodType = z.ZodType,
  TRes extends TWResponse = TWResponse,
>(
  fn: (req: Request<any, any, z.output<TBodySchema>>, res: TRes) => Promise<Result<TOut, unknown>>,
  body_validation_schema?: TBodySchema,
) {
  return async function (req: Request, res: TRes, next: NextFunction) {
    const req_start = Date.now();
    if (body_validation_schema) {
      const validation = body_validation_schema.safeParse(req.body);

      if (!validation.success) {
        return global_error_handler(validation.error, req, res, next);
      }

      req.body = validation.data;
    }

    const result = await fn(req as any, res);

    if (result.isErr()) {
      return global_error_handler(result.error, req, res, next);
    }

    const proc_duration = Date.now() - req_start;

    if (proc_duration > config.web.ms_request_considered_slow) {
      res.locals.logger.warn('slow request', {
        slow_thresh: config.web.ms_request_considered_slow,
        proc_duration,
        delta: proc_duration - config.web.ms_request_considered_slow,
      });
    }

    res.locals.logger.debug(`success`, {
      ...pretty_print_request_info(req, res),
      proc_duration,
    });

    return res.json(result.value);
  };
}
