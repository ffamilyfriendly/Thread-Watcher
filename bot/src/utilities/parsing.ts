import { Result } from 'neverthrow';
import { z } from 'zod';

export function safe_parse<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
): Result<z.infer<T>, Error> {
  const parser_function = Result.fromThrowable(schema.parse, (e) =>
    e instanceof Error ? e : new Error('could not parse'),
  );
  return parser_function(data);
}
