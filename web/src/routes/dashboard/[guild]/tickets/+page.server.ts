import { json_fetch } from '$lib/server/api';
import ensure_session from '$lib/server/ensure_session.js';
import { ZTicketListData } from '@watcher/shared';
import z from 'zod';

export async function load({ locals, params, url }) {
	const user = await ensure_session(locals);

	url.searchParams.set('guild_id', params.guild);

	const tickets = await json_fetch(
		`/tickets?${url.searchParams}`,
		{ user_id: user.user.id },
		z.array(ZTicketListData)
	);
	if (tickets.isErr()) throw tickets.error;

	return {
		tickets: tickets.value
	};
}
