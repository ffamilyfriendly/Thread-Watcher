import { json_fetch } from '$lib/server/api.js';
import { fetch_panel_stats } from '$lib/server/data_fetchers.js';
import ensure_session from '$lib/server/ensure_session.js';
import { ZTicketListData } from '@watcher/shared';
import z from 'zod';

export async function load({ locals, params }) {
	const { guild, panel_id } = params;
	const user = await ensure_session(locals);

	const [ticket_panel, tickets] = await Promise.all([
		fetch_panel_stats(guild, panel_id, user.user.id),
		json_fetch(
			`/tickets?panel_id=${panel_id}&guild_id=${guild}`,
			{ user_id: user.user.id },
			z.array(ZTicketListData)
		)
	]);

	if (ticket_panel.isErr())
		console.warn('panel/deploy could not load ticket panel stats', {
			error: ticket_panel.error,
			guild_id: guild,
			panel_id
		});
	if (tickets.isErr())
		console.warn('panel/deploy could not load open tickets', {
			error: tickets.error,
			guild_id: guild,
			panel_id
		});

	return {
		stats: ticket_panel.isOk() ? ticket_panel.value : null,
		tickets: tickets.isOk() ? tickets.value : null
	};
}
