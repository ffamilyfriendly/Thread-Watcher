import { fetch_landing_info } from '$lib/server/data_fetchers';

export async function load() {
	const data = await fetch_landing_info();
	if (data.isErr()) throw data.error;
	return { stats: data.value };
}
