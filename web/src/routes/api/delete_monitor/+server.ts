import { json_fetch } from '$lib/server/api';
import { check_ratelimit } from '$lib/server/ratelimit';
import { json } from '@sveltejs/kit';

export async function DELETE({ locals, url }) {
	const auth = await locals.auth();
	const guild_id = url.searchParams.get('guild_id');
	const monitor_id = url.searchParams.get('monitor_id');

	if (!guild_id || !monitor_id) {
		return json(
			{
				code: 400,
				message: 'required parameter missing'
			},
			{ status: 400 }
		);
	}

	if (!auth?.user.id) {
		return json(
			{
				code: 401,
				message: 'you are not logged in'
			},
			{ status: 401 }
		);
	}

	await check_ratelimit(auth?.user.id, 5, 10);

	const response = await json_fetch(`/guild/${guild_id}/monitors/${monitor_id}`, {
		method: 'DELETE',
		user_id: auth.user.id
	});

	if (response.isErr()) {
		return json(
			{
				code: 500,
				message: response.error.message
			},
			{ status: 500 }
		);
	}

	return json({
		code: 200,
		message: 'Deleted!'
	});
}
