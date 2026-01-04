import { json_fetch } from '$lib/server/api';
import { ZGuildOverview, type GuildOverview } from '$lib/types/internal_api';
import { error } from 'console';

export async function load({ locals, params }) {
	/*const guild_id = params.guild;
	const auth = await locals.auth();
	const guilds_res = await json_fetch<GuildOverview>(
		`/guilds/${guild_id}`,
		{ user_id: auth?.user.id },
		ZGuildOverview
	);

	if (guilds_res.isErr()) {
		if (guilds_res.error instanceof Error) {
			return error(500, 'Something went wrong');
		}

		return error(guilds_res.error.status, `API error: ${guilds_res.error.statusText}`);
	}

	return {
		guild: guilds_res.value
	};*/
}
