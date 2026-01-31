import { TOPGG_SECRET } from '$env/static/private';
import { redis_client, set_cached } from '$lib/server/cache';
import { json } from '@sveltejs/kit';
import z from 'zod';

const ZTopggWebhookSchema = z.object({
	bot: z.string(),
	user: z.string(),
	type: z.enum(['upvote', 'test']),
	isWeekend: z.boolean().default(false),
	query: z.string().nullish()
});

const free_premium_time_12h = 60 * 12;

export async function POST({ request }) {
	const auth_secret = request.headers.get('Authorization');
	if (!auth_secret)
		return json(
			{
				code: 401,
				message: 'Missing authorization'
			},
			{ status: 401 }
		);

	if (auth_secret.trim() != TOPGG_SECRET) {
		return json({ code: 403, message: 'secret does not match' }, { status: 403 });
	}

	const raw_body = await request.json();
	const parsed_body = ZTopggWebhookSchema.safeParse(raw_body);
	if (!parsed_body.success) {
		console.log('BAD BODY', raw_body);
		return json(
			{
				code: 400,
				message: 'malformed body'
			},
			{ status: 400 }
		);
	}

	if (parsed_body.data.query) {
		const query = new URLSearchParams(parsed_body.data.query);
		const ref_by_guild_id = query.get('guild_id');

		if (ref_by_guild_id) {
			// Only '.catch()' in the codebase I think. Anyhow. It's ok here
			redis_client
				.set(`entitlement:${ref_by_guild_id}:topgg`, 1, 'EX', free_premium_time_12h)
				.catch((e) => {
					console.error(`[REDIS] could not set free premium for '${ref_by_guild_id}'`, e);
				});
		}
	}

	return json({
		code: 200,
		message: 'OK'
	});
}
