import { json_fetch } from '$lib/server/api';
import { get_cached_or } from '$lib/server/cache';
import ensure_session from '$lib/server/ensure_session';
import { check_ratelimit } from '$lib/server/ratelimit.js';
import { ZGuildSettingsDictWithDefaults } from '@watcher/shared';

export async function load({ locals, params }) {
	const guild_id = params.guild;
	const user = await ensure_session(locals);
	await check_ratelimit(['pageload', params.guild, user.user.id], 5, 10);

	// ts hella uncached
	const settings_data = await json_fetch(
		`/guilds/${guild_id}/settings`,
		{ user_id: user.user.id },
		ZGuildSettingsDictWithDefaults
	);

	if (settings_data.isErr()) throw settings_data.error;

	return {
		settings: settings_data.value
	};
}
