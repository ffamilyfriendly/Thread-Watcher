import { get_monitors, get_threads } from '$lib/server/data_fetchers';
import ensure_session from '$lib/server/ensure_session.js';
import { error } from '@sveltejs/kit';

export async function load({ locals, params, url }) {
	const user = await ensure_session(locals);

	const page = url.searchParams.get('page') ?? '0';
	const page_as_num = Number(page);
	const monitor_id = url.searchParams.get('monitor');
	const parent_channel_id = url.searchParams.get('parent');

	const threads = await get_threads(params.guild, user.user.id, {
		page: page_as_num,
		monitor_id,
		parent_channel_id
	});

	if (threads.isErr()) throw threads.error;

	const monitors = await get_monitors(params.guild, user.user.id);
	if (monitors.isErr()) throw monitors.error;

	return {
		watched_threads: threads.value,
		monitors: monitors.value
	};
}
