import { json_fetch } from '$lib/server/api';
import ensure_session from '$lib/server/ensure_session.js';
import { check_ratelimit } from '$lib/server/ratelimit.js';
import { ZDashboardData } from '@watcher/shared';

export async function load({ locals, params, url }) {
	const user = await ensure_session(locals);

	const dashboard_data = await json_fetch(
		`/guilds/${params.guild}/dashboard`,
		{ user_id: user.user.id },
		ZDashboardData
	);
	if (dashboard_data.isErr()) throw dashboard_data.error;

	const { guild, ...rest } = dashboard_data.value;

	return { ...rest, d_guild: guild };
}
