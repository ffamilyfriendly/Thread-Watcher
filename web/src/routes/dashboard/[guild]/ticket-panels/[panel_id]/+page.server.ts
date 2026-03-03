import { fetch_ticket_panel } from '$lib/server/data_fetchers.js';
import { error } from '@sveltejs/kit';
import type { TicketPanel } from '@watcher/shared';

export async function load({ locals, params }) {
	const { guild, panel_id } = params;
	const auth = await locals.auth();

	if (!auth?.user.id) {
		return error(401);
	}

	if (panel_id === 'new') return {};

	const ticket_panel = await fetch_ticket_panel(guild, panel_id, auth.user.id);

	if (ticket_panel.isErr()) {
		return error(500, `${ticket_panel.error}`);
	}

	if (!ticket_panel.value) {
		return error(404, 'not found');
	}

	return {
		panel: ticket_panel.value
	};
}
