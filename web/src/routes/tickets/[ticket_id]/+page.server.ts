import { fetch_ticket } from '$lib/server/data_fetchers';

export async function load({ locals, params }) {
	const ticket_info = await fetch_ticket(params.ticket_id, locals.user.id);
	if (ticket_info.isErr()) throw ticket_info.error;
	return {
		ticket: ticket_info.value
	};
}
