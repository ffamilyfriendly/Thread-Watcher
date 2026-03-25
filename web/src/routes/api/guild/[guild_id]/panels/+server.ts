import { with_schema_auth } from '$lib/server/api_helper';
import { check_ratelimit } from '$lib/server/ratelimit';
import { ZTicketPanel } from '@watcher/shared';
import { del_from_cache } from '$lib/server/cache';
import { json_fetch } from '$lib/server/api';
import z from 'zod';

export async function POST(event) {
	const { params } = event;

	return with_schema_auth(event, ZTicketPanel, async (data, user_id) => {
		await check_ratelimit([user_id, 'modify_panels'], 5, 10);

		del_from_cache(`ticketservice:panels:${params.guild_id}`);

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
