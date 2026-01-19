import { json_fetch } from '$lib/server/api';
import { fetch_role } from '$lib/server/data_fetchers';
import { check_ratelimit } from '$lib/server/ratelimit';
import { json, type Handle } from '@sveltejs/kit';
import { ZEditMonitor } from '@watcher/shared';
import z from 'zod';
import { RetryAfterRateLimiter } from 'sveltekit-rate-limiter/server';

export async function PATCH({ locals, request }) {
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

	await check_ratelimit(auth?.user.id, 5, 10);

	const schema = z.object({
		guild_id: z.string(),
		monitor_id: z.string(),
		edit: ZEditMonitor
	});
	const parsed_body = schema.safeParse(body);
	if (!parsed_body.success) {
		return json(
			{
				code: 400,
				message: 'malformed request!'
			},
			{ status: 400 }
		);
	}

	const response = await json_fetch(
		`/guild/${parsed_body.data.guild_id}/monitors/${parsed_body.data.monitor_id}`,
		{
			body: JSON.stringify(parsed_body.data.edit),
			method: 'PATCH',
			user_id: auth.user.id
		}
	);

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

	return json({
		code: 200,
		message: 'saved settings!'
	});
}
