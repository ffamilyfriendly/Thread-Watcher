import { error } from '@sveltejs/kit';
import { get_cached_or } from '$lib/server/cache';
import { fetch_extended_audit, ZExtendedResult } from '$lib/server/data_fetchers';
import ensure_session from '$lib/server/ensure_session.js';

export async function load({ locals, params, url }) {
	const user = await ensure_session(locals);
	const guild_id = params.guild;
	const before_id = url.searchParams.get('before_id');

	let data_result;
	if (!before_id) {
		data_result = fetch_extended_audit(guild_id, user.user.id, before_id);
	} else {
		data_result = get_cached_or(
			`audit:${guild_id}:${before_id}`,
			ZExtendedResult,
			() => fetch_extended_audit(guild_id, user.user.id, before_id),
			500
		);
	}
	data_result = await data_result;

	if (data_result.isErr()) throw data_result.error;

	return {
		logs: data_result.value,
		guild_id
	};
}
