import { json_fetch } from '$lib/server/api';
import { check_ratelimit } from '$lib/server/ratelimit';
import { ZEditTicketPanel, ZTicketPanel } from '@watcher/shared';
import z from 'zod';
import { with_schema_auth } from '$lib/server/api_helper.js';

export async function POST(event) {
	return with_schema_auth(event, ZTicketPanel, async (data, user_id) => {
		await check_ratelimit(user_id, 5, 10);
		return json_fetch(
			`/guild/${data.guild_id}/panels`,
			{
				body: JSON.stringify(data),
				method: 'POST',
				user_id
			},
			z.object({ panel_id: z.string() })
		);
	});
}

export async function PUT(event) {
	return with_schema_auth(
		event,
		ZEditTicketPanel.extend({ panel_id: z.string(), guild_id: z.string() }),
		async (data, user_id) => {
			await check_ratelimit(user_id, 5, 10);
			return json_fetch(`/guild/${data.guild_id}/panels/${data.panel_id}`, {
				body: JSON.stringify(data),
				method: 'PUT',
				user_id
			});
		}
	);
}
