import { json_fetch } from '$lib/server/api';
import { return_sveltekit_http_err, with_query_auth } from '$lib/server/api_helper';
import ensure_session from '$lib/server/ensure_session.js';
import { check_ratelimit } from '$lib/server/ratelimit.js';
import { json } from '@sveltejs/kit';
import { ZMessagesView } from '@watcher/shared';
import { err } from 'neverthrow';

export async function GET({ params, locals, url }) {
	const session = await ensure_session(locals);
	await check_ratelimit([session.user.id, 'get_messages'], 5, 10);

	const res = await json_fetch(
		`/tickets/${params.ticket_id}/messages${url.search}`,
		{ user_id: session.user.id },
		ZMessagesView
	);
	if (res.isErr()) return return_sveltekit_http_err(res.error);
	return json(res.value, { status: 200 });
}
