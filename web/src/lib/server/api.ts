import { SHARED_API_SECRET, API_URI } from '$env/static/private';
import { map_err } from '$lib/error_helper';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import type z from 'zod';

export function safe_fetch(input: string | URL | Request, init?: RequestInit) {
	const _wrapped_fetch = Result.fromThrowable(fetch);
	return _wrapped_fetch(input, init).match(
		async (res) => {
			const safe_res = ResultAsync.fromPromise(res, (e) => new Error(e?.toString()));
			return safe_res;
		},
		(error) => {
			if (error instanceof Error) return err(error);
			return err(new Error(error?.toString()));
		}
	);
}

interface ExtraDetails extends RequestInit {
	user_id?: string;
}

export async function api_fetch(
	endpoint: `/${string}`,
	init?: ExtraDetails
): Promise<Result<Response, Error>> {
	const api_url = `${API_URI}${endpoint}`;

	let headers: HeadersInit = {
		'X-Internal-Auth': SHARED_API_SECRET,
		...init?.headers
	};

	if (init?.body && typeof init.body == 'string') {
		headers = {
			'Content-Type': 'application/json',
			...headers
		};
	}

	if (init?.user_id) {
		headers = {
			'X-User-Id': init.user_id,
			...headers
		};
	}

	return safe_fetch(api_url, {
		...init,
		headers
	});
}

async function write_nice_error(req: Response) {
	const text_res = await ResultAsync.fromPromise(req.text(), map_err);
	if (text_res.isErr()) return text_res.error;
	const body_text = text_res.value;

	try {
		const json = JSON.parse(body_text);
		if (json && typeof json === 'object' && 'message' in json) {
			return new Error(String(json.message));
		}
	} catch {
		return new Error(body_text.substring(0, 500) || req.statusText);
	}

	return new Error(req.statusText);
}

export async function json_fetch<T>(
	endpoint: `/${string}`,
	init?: ExtraDetails,
	schema?: z.ZodType<T>
) {
	const res = await api_fetch(endpoint, init);

	if (res.isErr()) {
		return err(res.error);
	}

	const response = res.value;

	if (!response.ok) {
		return err(await write_nice_error(response));
	}

	return ResultAsync.fromPromise(response.json(), (e) =>
		e instanceof Error ? e : new Error(e?.toString())
	).andThen((data) => {
		if (schema) {
			const parsed = schema.safeParse(data);
			if (!parsed.success) {
				return err(parsed.error);
			}

			return ok(parsed.data);
		}

		return ok(data as T);
	});
}
