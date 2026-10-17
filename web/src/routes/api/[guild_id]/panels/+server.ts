import { fetch_ticket_panels } from '$lib/server/data_fetchers';
import ensure_session from '$lib/server/ensure_session';
import { json } from '@sveltejs/kit';

export async function GET({ locals, params }) {
	const user = await ensure_session(locals);
	const ticket_panels = await fetch_ticket_panels(params.guild_id, user.user.id);
	if (ticket_panels.isErr()) throw ticket_panels.error;
	return json(ticket_panels.value, { status: 200 });
}
