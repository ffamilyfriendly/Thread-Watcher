import { json_fetch } from '$lib/server/api';
import { fetch_ticket_panels } from '$lib/server/data_fetchers';
import ensure_session from '$lib/server/ensure_session.js';
import { check_ratelimit } from '$lib/server/ratelimit.js';
import { ZTicketListData } from '@watcher/shared';
import z from 'zod';

export async function load({ locals, params, url }) {
	const user = await ensure_session(locals);
	await check_ratelimit([user.user.id, 'query_tickets'], 5, 5);

	url.searchParams.set('guild_id', params.guild);

	const tickets = await json_fetch(
		`/tickets?${url.searchParams}`,
		{ user_id: user.user.id },
		z.array(ZTicketListData)
	);
	if (tickets.isErr()) throw tickets.error;

	const ticket_panels = await fetch_ticket_panels(params.guild, locals.user.id);
	if (ticket_panels.isErr()) throw ticket_panels.error;

	return {
		tickets: tickets.value,
		panels: ticket_panels.value
	};
}
