import { fetch_ticket_panel } from '$lib/server/data_fetchers.js';
import ensure_session from '$lib/server/ensure_session.js';
import { error } from '@sveltejs/kit';
import type { TicketPanel } from '@watcher/shared';

export async function load({ locals, params }) {
	const { guild, panel_id } = params;
	const user = await ensure_session(locals);

	const ticket_panel = await fetch_ticket_panel(guild, panel_id, user.user.id);

	if (ticket_panel.isErr()) throw ticket_panel.error;

	if (!ticket_panel.value) {
		return error(404, 'not found');
	}

	return {
		panel: ticket_panel.value
	};
}
