import { err, ok, Result } from 'neverthrow';
import { z } from 'zod';

export function safe_parse<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
): Result<z.output<T>, Error> {
  const result = schema.safeParse(data);
  return result.success ? ok(result.data) : err(result.error);
}

export function safe_json(input: string) {
  const safe_parse = Result.fromThrowable(JSON.parse);
  return safe_parse(input);
}
