import { err, ok, Result } from 'neverthrow';
import { z } from 'zod';

export function safe_parse<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
): Result<z.output<T>, Error> {
  const result = schema.safeParse(data);
  return result.success ? ok(result.data) : err(result.error);
}

export function as_res<TIn, TOut>(r: z.SafeParseReturnType<TIn, TOut>): Result<TOut, Error> {
  return r.success ? ok(r.data) : err(r.error);
}
