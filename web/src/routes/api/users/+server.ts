import { json_fetch } from '$lib/server/api.js';
import { with_schema_auth } from '$lib/server/api_helper.js';
import { check_ratelimit } from '$lib/server/ratelimit';
import z from 'zod';

export function POST(event) {
	return with_schema_auth(
		event,
		z.object({ guild_id: z.string(), user_ids: z.array(z.string()) }),
		async (data, user_id) => {
			await check_ratelimit([user_id, 'get_users'], 5, 10);
			return await json_fetch(`/users/batch`, {
				user_id,
				body: JSON.stringify(data),
				method: 'POST'
			});
		}
	);
}
