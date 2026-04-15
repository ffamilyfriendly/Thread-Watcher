import { proxied_fetch } from '$lib/server/api.js';

export async function POST({ request }) {
	return proxied_fetch('/webhook/top-gg', request);
}
