import { get_monitors, get_threads } from '$lib/server/data_fetchers';
import { error } from '@sveltejs/kit';

const PAGE_SIZE = 20;

export async function load({ locals, params, url }) {
	const auth = await locals.auth();

	if (!auth?.user) {
		return error(401, 'not authenticated');
	}

	const threads = await get_threads(params.guild, auth.user.id);

	if (threads.isErr()) {
		console.error('ERROR', threads.error);
		return error(500, 'Something went wrooong');
	}

	const page = url.searchParams.get('page') ?? '0';
	const page_as_num = Number(page);
	const start_at = page_as_num * PAGE_SIZE;

	let filtered_entries = threads.value;

	const manager = url.searchParams.get('monitor');
	if (manager) {
		filtered_entries = filtered_entries.filter((en) => en.managed_by === manager);
	}

	const entries = filtered_entries.slice(start_at, start_at + PAGE_SIZE);

	const monitors = await get_monitors(params.guild, auth.user.id);
	if (monitors.isErr()) {
		return error(500, 'could not fetch monitors');
	}

	return {
		watched_threads: entries,
		monitors: monitors.value
	};
}
