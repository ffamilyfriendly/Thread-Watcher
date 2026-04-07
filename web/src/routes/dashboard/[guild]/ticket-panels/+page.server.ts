import { fetch_ticket_panels } from '$lib/server/data_fetchers';
import ensure_session from '$lib/server/ensure_session.js';

export async function load({ locals, params }) {
	const user = await ensure_session(locals);
	const ticket_panels = await fetch_ticket_panels(params.guild, user.user.id);
	if (ticket_panels.isErr()) throw ticket_panels.error;

	return {
		panels: ticket_panels.value
	};
}
