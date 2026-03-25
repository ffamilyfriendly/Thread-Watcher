import { json_fetch } from '$lib/server/api';
import { return_sveltekit_http_err } from '$lib/server/api_helper';
import ensure_session from '$lib/server/ensure_session.js';
import { check_ratelimit } from '$lib/server/ratelimit.js';
import { json } from '@sveltejs/kit';
import type { TicketNote } from '@watcher/shared';
import z from 'zod';

export async function POST({ params, locals, request }) {
	const session = await ensure_session(locals);
	await check_ratelimit([session.user.id, 'manipulate_notes'], 5, 10);

	const body = await request.json();
	const parsed = z.object({ text: z.string().min(5).max(100) }).safeParse(body);
	if (!parsed.success) return json({ error: 'Invalid body' }, { status: 400 });

	const res = await json_fetch(
		`/tickets/${params.ticket_id}/notes`,
		{ user_id: session.user.id, method: 'POST', body: JSON.stringify(parsed.data) },
		z.object({ note_id: z.string() })
	);
	if (res.isErr()) return return_sveltekit_http_err(res.error);

	const modnote: TicketNote = {
		note_id: res.value.note_id,
		text: parsed.data.text,
		ticket_id: params.ticket_id,
		created_by: session.user.id,
		created_at: new Date()
	};

	return json(modnote, { status: 200 });
}
