import { get_monitors } from '$lib/server/data_fetchers.js';
import { error } from '@sveltejs/kit';

export async function load({ locals, params }) {
	const auth = await locals.auth();

	if (!auth?.user) {
		return error(401, 'not authenticated');
	}

	const monitors = await get_monitors(params.guild, auth.user.id);

	if (monitors.isErr()) {
		console.error('ERROR', monitors.error);
		return error(500, 'Something went wrooong');
	}

	return {
		monitors: monitors.value
	};
}
