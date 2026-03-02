import { json_fetch } from '$lib/server/api';
import { check_ratelimit } from '$lib/server/ratelimit';
import { ZTicketPanel } from '@watcher/shared';
import z from 'zod';
import { with_schema_auth } from '$lib/server/api_helper.js';

export async function POST(event) {
	return with_schema_auth(
		event,
		ZTicketPanel.extend({ guild_id: z.string() }),
		async (data, user_id) => {
			await check_ratelimit(user_id, 5, 10);
			return json_fetch(`/guild/${data.guild_id}/panels`, {
				body: JSON.stringify(data),
				method: 'POST',
				user_id
			});
		}
	);
}
