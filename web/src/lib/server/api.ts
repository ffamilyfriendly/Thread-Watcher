import { SHARED_API_SECRET, API_URI } from '$env/static/private';
import { err, ok, type Result } from 'neverthrow';

export async function api_fetch(
	endpoint: `/${string}`,
	init?: RequestInit
): Promise<Result<Response, Error>> {
	const api_url = `${API_URI}${endpoint}`;

	console.log(api_url);
	let headers: HeadersInit = {
		Authorization: SHARED_API_SECRET,
		...init?.headers
	};

	if (init?.body && typeof init.body == 'string') {
		headers = {
			'Content-Type': 'application/json',
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
