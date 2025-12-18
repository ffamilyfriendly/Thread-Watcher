import { SHARED_API_SECRET, API_URI } from '$env/static/private';
import { err, ok, Result, ResultAsync } from 'neverthrow';

interface ExtraDetails extends RequestInit {
	user_id?: string;
}

export async function api_fetch(
	endpoint: `/${string}`,
	init?: ExtraDetails
): Promise<Result<Response, Error>> {
	const api_url = `${API_URI}${endpoint}`;

	console.log(api_url);
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

	const response = await fetch(api_url, {
		...init,
		headers
	});

	if (!response.ok) {
		return err(new Error(`${response.status}: ${response.statusText}`));
	}

	return ok(response);
}

export async function json_fetch<T = unknown>(endpoint: `/${string}`, init?: ExtraDetails) {
	const req = await api_fetch(endpoint, init);

	if (req.isErr()) {
		return err(req.error);
	}

	return ResultAsync.fromPromise(req.value.json(), (e) =>
		e instanceof Error ? e : new Error(`${e}`)
	).match(
		(val) => ok(val as T),
		(e) => err(e)
	);
}
