import { json_fetch } from '$lib/server/api';
import { return_sveltekit_http_err } from '$lib/server/api_helper';
import ensure_session from '$lib/server/ensure_session.js';
import { check_ratelimit } from '$lib/server/ratelimit.js';
import { json } from '@sveltejs/kit';
import z from 'zod';

export async function DELETE({ params, locals, url }) {
	const session = await ensure_session(locals);
	await check_ratelimit([session.user.id, 'manipulate_notes'], 5, 10);

	const res = await json_fetch(
		`/tickets/${params.ticket_id}/notes/${params.note_id}`,
		{ user_id: session.user.id, method: 'DELETE' },
		z.any()
	);
	if (res.isErr()) return return_sveltekit_http_err(res.error);
	return json(res.value, { status: 200 });
}
