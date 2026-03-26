import { logger } from '@providers/logger';
import { Result } from 'neverthrow';
import { Response } from 'express';
import { TWResponse } from './logging';
// res: Response, err_msg: string, code: number, e: unknown
export function api_error({
  response: res,
  error_message: err_msg,
  http_status_code: code,
  error_object: e,
}: {
  response: Response;
  error_message: string;
  http_status_code: number;
  error_object: unknown;
}) {
  return res.status(500).json({
    code: code,
    message: err_msg,
    _details: e,
  });
}

export async function handle_res<T, E>(
  res: TWResponse,
  result: Result<T, E> | Promise<Result<T, E>>,
  error_message = 'An error occured',
) {
  const r = await result;
  if (r.isErr()) {
    res.locals.logger.error(error_message, r.error);
    return api_error({
      response: res,
      error_message: error_message,
      http_status_code: 500,
      error_object: r.error,
    });
  }

  return res.json(r.value);
}

export function bad_format(response: Response, details: Error) {
  return api_error({
    response,
    http_status_code: 400,
    error_message: 'malformed request',
    error_object: details,
  });
}
