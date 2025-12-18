import { json_fetch } from '$lib/server/api';

export async function load({ locals, params }) {
	const guild_id = params.guild;

	const guilds_res = await json_fetch(`/guilds/${guild_id}`);

	if (guilds_res.isErr()) {
		return {
			error: guilds_res.error
		};
	}

	return {
		guild: guilds_res.value
	};
}
