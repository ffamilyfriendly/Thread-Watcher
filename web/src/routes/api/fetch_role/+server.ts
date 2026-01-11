import { fetch_role } from '$lib/server/data_fetchers';
import { json } from '@sveltejs/kit';

export async function GET({ locals, url }) {
	const auth = await locals.auth();
	const role_id = url.searchParams.get('role_id');
	const guild_id = url.searchParams.get('guild_id');

	if (!role_id || !guild_id) {
		return json({
			code: 400,
			message: 'missing required parameters'
		});
	}

	if (!auth?.user.id) {
		return json({
			code: 401,
			message: 'you are not logged in'
		});
	}

	const channel_res = await fetch_role(guild_id, auth.user.id, role_id);
	if (channel_res.isErr()) {
		console.log(channel_res.error);
		return json({
			code: 500,
			message: 'something went wrong'
		});
	}

	return json(channel_res.value);
}
