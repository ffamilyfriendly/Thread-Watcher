import { api_fetch, json_fetch } from '$lib/server/api.js';
import { del_from_cache, get_cached, set_cached } from '$lib/server/cache.js';
import { fetch_role } from '$lib/server/data_fetchers';
import ensure_session from '$lib/server/ensure_session.js';
import { ZGuildOverview, ZMappedSettings } from '$lib/types/internal_api.js';
import { json } from '@sveltejs/kit';
import z from 'zod';

export async function POST({ locals, request }) {
	const auth = await ensure_session(locals);
	const body = await request.json();

	const schema = z.object({
		guild_id: z.string(),
		updated_settings: z.record(z.string(), z.unknown())
	});

	const mapped_settings = schema.parse(body);

	const response = await json_fetch(`/guilds/${mapped_settings.guild_id}/settings`, {
		body: JSON.stringify(mapped_settings.updated_settings),
		method: 'POST',
		user_id: auth.user.id
	});

	if (response.isErr()) throw response.error;

	const redis_key = `${mapped_settings.guild_id}:overviewInfo`;
	del_from_cache(redis_key);

	return json({
		code: 200,
		message: 'saved settings!'
	});
}
