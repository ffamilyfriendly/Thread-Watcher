import { err, Result } from 'neverthrow';
import { NextFunction, Response, Request } from 'express';
import { TWResponse } from './logging';
import { get_safe_error } from '#/utilities/error/escape_sensitive_data';
import { map_err } from '#/utilities/error';
import { ZodError } from 'zod';
import { TicketNotFound } from '#/utilities/error/def';

class APIError extends Error {
  constructor(
    message: string,
    readonly code: number,
    options?: ErrorOptions,
  ) {
    super(message);
  }
}

export namespace HTTPCodes {
  export const CONTINUE = 100;
  export const OK = 200;
  export const CREATED = 201;
  export const ACCEPTED = 202;
  export const NO_CONTENT = 204;
  export const BAD_REQUEST = 400;
  export const UNAUTHORIZED = 401;
  export const PAYMENT_REQUIRED = 402;
  export const FORBIDDEN = 403;
  export const NOT_FOUND = 404;
  export const IM_A_TEAPOT = 418;
  export const TOO_MANY_REQUESTS = 429;
  export const INTERNAL_SERVER_ERROR = 500;
  export const NOT_IMPLEMENTED = 501;
}

export function api_err(code: number, message: string = 'Something went wrong') {
  return err(new APIError(message, code));
}

function get_values_for_error(e: Error): { code: number; message: string; status_str: string } {
  let code = 500;
  let message = e.message || 'An unexpected error occured';
  let status_str = 'INTERNAL_ERROR';

  if ('code' in e && typeof e.code === 'number') code = e.code;

  if (e instanceof ZodError) {
    code = 400;
    status_str = 'VALIDATION_ERROR';
    message = 'Invalid request data';
  }

  if (e instanceof TicketNotFound) {
    code = 404;
    status_str = 'NOT_FOUND';
  }

  return { code, message, status_str };
}

export function global_error_handler(
  err: unknown,
  req: Request,
  res: TWResponse,
  next: NextFunction,
) {
  const safe_err = get_safe_error(map_err(err));
  const { code, message, status_str } = get_values_for_error(safe_err);

  res.locals.logger.error(`${code} (${status_str})`, safe_err);

  res.status(code).json({
    code: code,
    status: status_str,
    message: message,
    _details: safe_err,
  });
}
