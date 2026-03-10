import { fetch_ticket_panels } from '$lib/server/data_fetchers';

export async function load({ locals, params }) {
	const ticket_panels = await fetch_ticket_panels(params.guild, locals.user.id);
	if (ticket_panels.isErr()) throw ticket_panels.error;

	return {
		panels: ticket_panels.value
	};
}
