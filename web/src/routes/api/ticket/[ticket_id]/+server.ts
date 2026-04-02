import { json_fetch } from '$lib/server/api';
import { return_sveltekit_http_err } from '$lib/server/api_helper';
import ensure_session from '$lib/server/ensure_session.js';
import { check_ratelimit } from '$lib/server/ratelimit.js';
import { json } from '@sveltejs/kit';
import z from 'zod';

// It's against the REST gods to do an action in this particular way but ion care rn.
// ofc a post to /ticket/<ticket_id> should mean we are resolving a ticket. IT JUST MAKES SENSE
// note: calling this endpoint will resolve a ticket. This cannot be undone
export async function POST({ params, locals, url }) {
	const session = await ensure_session(locals);
	await check_ratelimit([session.user.id, 'delete_or_resolve_ticket'], 5, 10);

	const res = await json_fetch(
		`/tickets/${params.ticket_id}/resolve`,
		{ user_id: session.user.id, method: 'POST' },
		z.any()
	);
	if (res.isErr()) return return_sveltekit_http_err(res.error);
	return json(res.value, { status: 200 });
}

export async function DELETE({ params, locals }) {
	const session = await ensure_session(locals);
	await check_ratelimit([session.user.id, 'delete_or_resolve_ticket'], 5, 10);

	const res = await json_fetch(
		`/tickets/${params.ticket_id}`,
		{ user_id: session.user.id, method: 'DELETE' },
		z.any()
	);
	if (res.isErr()) return return_sveltekit_http_err(res.error);
	return json(res.value, { status: 200 });
}
