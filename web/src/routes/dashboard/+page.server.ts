import { api_fetch } from '$lib/server/api.js';
import { DISCORD_CLIENT_ID, BOT_ADDED_URL } from '$env/static/private';

function gen_inv(guild_id: string) {
	const client_id = DISCORD_CLIENT_ID;
	const permissions = '0';
	const redirect_uri = encodeURIComponent(BOT_ADDED_URL);
	return `https://discord.com/api/oauth2/authorize?client_id=${client_id}&permissions=${permissions}&scope=bot&guild_id=${guild_id}&response_type=code&redirect_uri=${redirect_uri}`;
}

export async function load({ locals }) {
	const session = await locals.auth();

	if (!session?.access_token) {
		return {
			guilds: []
		};
	}

	const res = await fetch(`https://discord.com/api/users/@me/guilds`, {
		headers: {
			Authorization: `Bearer ${session.access_token}`
		}
	});

	const guilds = (await res.json()) as DiscordGuild[];

	const guilds_res = await api_fetch('/guilds/viewable', {
		body: JSON.stringify(guilds.map((g) => g.id)),
		method: 'POST'
	});

	if (guilds_res.isErr()) {
		return {
			guilds: []
		};
	}

	const as_json = (await guilds_res.value.json()) as string[];
	const can_add_bot = (guild: DiscordGuild) => guild.owner || Number(guild.permissions) & 0x20;

	const show_guilds = guilds
		.map((guild) => {
			const can_add = can_add_bot(guild);
			const guild_has_bot = as_json.includes(guild.id);
			const should_not_show = !(can_add || guild_has_bot);

			return {
				...guild,
				can_add,
				guild_has_bot,
				should_not_show,
				action_link: guild_has_bot ? `/dashboard/${guild.id}` : gen_inv(guild.id)
			};
		})
		.filter((g) => !g.should_not_show);

	return {
		guilds: show_guilds
	};
}
