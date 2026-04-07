import { json_fetch } from '$lib/server/api';
import { fetch_dash_info } from '$lib/server/data_fetchers';
import ensure_session from '$lib/server/ensure_session.js';
import { check_ratelimit } from '$lib/server/ratelimit.js';
import { ZDashboardData } from '@watcher/shared';

export async function load({ locals, params, url }) {
	const user = await ensure_session(locals);
	await check_ratelimit(['dashoverview', params.guild, user.user.id], 5, 10);

	const dashboard_data = await fetch_dash_info(params.guild, user.user.id);
	if (dashboard_data.isErr()) throw dashboard_data.error;

	const { guild, ...rest } = dashboard_data.value;

	return { ...rest, d_guild: guild };
}
