import { json_fetch } from '$lib/server/api';
import { get_cached_or } from '$lib/server/cache.js';
import ensure_session from '$lib/server/ensure_session.js';
import { ZGuildOverview } from '@watcher/shared';

export async function load({ locals, params }) {
	const guild_id = params.guild;
	const user = await ensure_session(locals);

	// Keeping this pretty low as the result of this is a combination of seperatly cached data.
	// this cache value will not be busted if any change to underlying data occurs.
	const CACHE_TTL_SECONDS = 60 * 2;
	const essential_data = await get_cached_or(
		`${guild_id}:overviewInfo`,
		ZGuildOverview,
		() => {
			return json_fetch(`/guilds/${guild_id}`, { user_id: user.user.id }, ZGuildOverview);
		},
		CACHE_TTL_SECONDS
	);

	if (essential_data.isErr()) throw essential_data.error;

	return {
		base: essential_data.value
	};
}
