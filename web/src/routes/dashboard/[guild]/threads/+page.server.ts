import { get_monitors, get_threads } from '$lib/server/data_fetchers';
import { error } from '@sveltejs/kit';

export async function load({ locals, params, url }) {
	const auth = await locals.auth();
	console.log('hello rendering');
	if (!auth?.user) {
		return error(401, 'not authenticated');
	}

	const page = url.searchParams.get('page') ?? '0';
	const page_as_num = Number(page);
	const monitor_id = url.searchParams.get('monitor');
	const parent_channel_id = url.searchParams.get('parent');

	const threads = await get_threads(params.guild, auth.user.id, {
		page: page_as_num,
		monitor_id,
		parent_channel_id
	});

	if (threads.isErr()) {
		console.error('ERROR', threads.error);
		return error(500, 'Something went wrooong');
	}

	const monitors = await get_monitors(params.guild, auth.user.id);
	if (monitors.isErr()) {
		return error(500, 'could not fetch monitors');
	}

	return {
		watched_threads: threads.value,
		monitors: monitors.value
	};
}
