import { fetch_channel } from '$lib/server/data_fetchers';
import { json } from '@sveltejs/kit';

export async function GET({ locals, url }) {
	const auth = await locals.auth();
	const channel_id = url.searchParams.get('channel_id');
	const guild_id = url.searchParams.get('guild_id');

	if (!channel_id || !guild_id) {
		return json(
			{
				code: 400,
				message: 'missing required parameters'
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

	const channel_res = await fetch_channel(guild_id, auth.user.id, channel_id);
	if (channel_res.isErr()) {
		console.log(channel_res.error);
		return json(
			{
				code: 500,
				message: 'something went wrong'
			},
			{ status: 500 }
		);
	}

	return json(channel_res.value);
}
