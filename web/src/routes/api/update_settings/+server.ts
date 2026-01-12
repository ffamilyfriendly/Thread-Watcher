import { api_fetch, json_fetch } from '$lib/server/api.js';
import { del_from_cache, get_cached, set_cached } from '$lib/server/cache.js';
import { fetch_role } from '$lib/server/data_fetchers';
import { ZGuildOverview, ZMappedSettings } from '$lib/types/internal_api.js';
import { json } from '@sveltejs/kit';
import z from 'zod';

export async function POST({ locals, request }) {
	const auth = await locals.auth();
	const body = await request.json();

	if (!auth?.user.id) {
		return json(
			{
				code: 401,
				message: 'you are not logged in'
			},
			{ status: 401 }
		);
	}

	const schema = z.object({
		guild_id: z.string(),
		updated_settings: z.record(z.string(), z.unknown())
	});

	const mapped_settings = schema.safeParse(body);

	if (!mapped_settings.success) {
		return json(
			{
				code: 400,
				message: 'wrong format'
			},
			{ status: 400 }
		);
	}

	const response = await json_fetch(`/guilds/${mapped_settings.data.guild_id}/settings`, {
		body: JSON.stringify(mapped_settings.data.updated_settings),
		method: 'POST',
		user_id: auth.user.id
	});

	if (response.isErr()) {
		return json(
			{
				code: 500,
				message: response.error.message
			},
			{ status: 500 }
		);
	}

	console.log(response.value);

	const redis_key = `${mapped_settings.data.guild_id}:overviewInfo`;
	del_from_cache(redis_key);

	return json({
		code: 200,
		message: 'saved settings!'
	});
}
