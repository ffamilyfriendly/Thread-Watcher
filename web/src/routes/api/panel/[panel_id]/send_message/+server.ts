// /:guild_id/panels/:panel_id/send_message

import { json_fetch } from '$lib/server/api';
import { with_schema_auth } from '$lib/server/api_helper';
import { check_ratelimit } from '$lib/server/ratelimit';
import z from 'zod';

export async function POST(event) {
	return with_schema_auth(
		event,
		z.object({ panel_id: z.string(), guild_id: z.string() }),
		async (data, user_id) => {
			await check_ratelimit(user_id, 5, 10);
			return json_fetch(
				`/guild/${data.guild_id}/panels/${data.panel_id}/send_message`,
				{
					body: JSON.stringify(data),
					method: 'POST',
					user_id
				},
				z.object({ message_id: z.string() })
			);
		}
	);
}
