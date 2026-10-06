import { redirect } from '@sveltejs/kit';

export function load({ params }) {
	return redirect(301, `/dashboard/${params.guild}/ticket-panels/${params.panel_id}/deploy`);
}
