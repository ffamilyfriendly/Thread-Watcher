import { Result } from 'neverthrow';
import { z } from 'zod';

export function safe_parse<T>(schema: z.ZodSchema<T>, data: unknown): Result<T, Error> {
  const parser_function = Result.fromThrowable(schema.parse, (e) =>
    e instanceof Error ? e : new Error('could not parse'),
  );
  return parser_function(data);
}
