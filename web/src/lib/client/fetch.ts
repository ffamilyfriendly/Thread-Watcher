import { map_err } from '$lib/error_helper';
import { err, ResultAsync, ok } from 'neverthrow';
import type z from 'zod';

export async function fetch_as_json<T>(
	path: `/${string}`,
	init?: RequestInit,
	schema?: z.ZodType<T>
) {
	const result_request = await ResultAsync.fromPromise(fetch(path, init), map_err);

	if (result_request.isErr()) return err(result_request.error);
	if (!result_request.value.ok) return err(new Error('Request not OK'));

	const as_json = await ResultAsync.fromPromise(result_request.value.json(), map_err);
	if (as_json.isErr()) return err(as_json.error);

	if (!schema) return ok(as_json.value as T);

	const parsed = schema.safeParse(as_json.value);
	if (!parsed.success) return err(parsed.error);

	return ok(parsed.data);
}
