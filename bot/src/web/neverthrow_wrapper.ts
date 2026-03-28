import { Result } from 'neverthrow';
import { TWResponse } from './utils/logging';
import { NextFunction, Request } from 'express';
import { global_error_handler } from './utils/error';

export function safe_route<TRes extends TWResponse>(
  fn: (req: Request, res: TRes) => Promise<Result<unknown, unknown>>,
) {
  return async function (req: Request, res: TRes, next: NextFunction) {
    const result = await fn(req, res);

    if (result.isErr()) {
      return global_error_handler(result.error, req, res, next);
    }

    return res.json(result.value);
  };
}
