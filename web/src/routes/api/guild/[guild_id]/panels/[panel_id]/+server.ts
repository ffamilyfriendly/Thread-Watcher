import { json_fetch } from '$lib/server/api';
import { return_sveltekit_http_err, with_schema_auth } from '$lib/server/api_helper';
import { del_from_cache } from '$lib/server/cache';
import ensure_session from '$lib/server/ensure_session';
import { check_ratelimit } from '$lib/server/ratelimit';
import { json } from '@sveltejs/kit';
import { ZEditTicketPanel } from '@watcher/shared';
import z from 'zod';

export async function DELETE({ params, locals }) {
	const session = await ensure_session(locals);
	await check_ratelimit([session.user.id, 'modify_panels'], 5, 10);
	del_from_cache(`ticketservice:panels:${params.guild_id}`);
	const res = await json_fetch(
		`/guild/${params.guild_id}/panels/${params.panel_id}`,
		{ user_id: session.user.id, method: 'DELETE' },
		z.any()
	);
	if (res.isErr()) return return_sveltekit_http_err(res.error);

	return json(res.value, { status: 200 });
}

export async function PUT(event) {
	const { params } = event;
	return with_schema_auth(event, ZEditTicketPanel, async (data, user_id) => {
		await check_ratelimit([user_id, 'modify_panels'], 5, 10);
		del_from_cache(`ticketservice:panels:${params.guild_id}`);
		return json_fetch(`/guild/${params.guild_id}/panels/${params.panel_id}`, {
			body: JSON.stringify(data),
			method: 'PUT',
			user_id
		});
	});
}
