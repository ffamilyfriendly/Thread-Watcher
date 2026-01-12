import { map_err } from '$lib/error_helper';
import { err, ResultAsync, ok } from 'neverthrow';
import type z from 'zod';

export async function safe_fetch(path: `/${string}`, init?: RequestInit) {
	const request = await ResultAsync.fromPromise(fetch(path, init), map_err);

	if (request.isErr()) return err(request.error);

	if (!request.value.ok) {
		console.log('TEXT IS ALL KINDS OF FUCKED');
		const text_res = await ResultAsync.fromPromise(request.value.text(), map_err);
		if (text_res.isErr()) return err(text_res.error);
		const body_text = text_res.value;

		try {
			console.log('tryna do json thing');
			const json = JSON.parse(body_text);
			if (json && typeof json === 'object' && 'message' in json) {
				console.log('HIIII', json);
				return err(new Error(String(json.message)));
			}
		} catch {
			console.log('HUHHH????');
			return err(new Error(body_text.substring(0, 500) || request.value.statusText));
		}
	}

	return ok(request.value);
}

export async function fetch_as_json<T>(
	path: `/${string}`,
	init?: RequestInit,
	schema?: z.ZodType<T>
) {
	const result_request = await safe_fetch(path, init);

	if (result_request.isErr()) return err(result_request.error);

	const as_json = await ResultAsync.fromPromise(result_request.value.json(), map_err);
	if (as_json.isErr()) return err(as_json.error);

	if (!schema) return ok(as_json.value as T);

	const parsed = schema.safeParse(as_json.value);
	if (!parsed.success) return err(parsed.error);

	return ok(parsed.data);
}
