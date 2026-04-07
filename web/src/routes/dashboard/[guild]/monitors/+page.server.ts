import { get_monitors } from '$lib/server/data_fetchers.js';
import ensure_session from '$lib/server/ensure_session.js';
import { error } from '@sveltejs/kit';

export async function load({ locals, params }) {
	const user = await ensure_session(locals);

	const monitors = await get_monitors(params.guild, user.user.id);

	if (monitors.isErr()) throw monitors.error;

	return {
		monitors: monitors.value
	};
}
