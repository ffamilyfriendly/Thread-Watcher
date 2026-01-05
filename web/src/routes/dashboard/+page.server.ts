import { api_fetch, safe_fetch } from '$lib/server/api.js';
import { DISCORD_CLIENT_ID, BOT_ADDED_URL } from '$env/static/private';
import { ZDiscordGuild, type DiscordGuild } from '$lib/types/discord.js';
import z from 'zod';
import { error } from '@sveltejs/kit';
import { get_cached, get_cached_or } from '$lib/server/cache';
import { err, Result, ok } from 'neverthrow';

function gen_inv(guild_id: string) {
	const client_id = DISCORD_CLIENT_ID;
	const permissions = '0';
	const redirect_uri = encodeURIComponent(BOT_ADDED_URL);
	return `https://discord.com/api/oauth2/authorize?client_id=${client_id}&permissions=${permissions}&scope=bot&guild_id=${guild_id}&response_type=code&redirect_uri=${redirect_uri}`;
}

async function get_guilds(access_token: string): Promise<Result<DiscordGuild[], Error | Response>> {
	const res = await safe_fetch(`https://discord.com/api/users/@me/guilds`, {
		headers: {
			Authorization: `Bearer ${access_token}`
		}
	});

	if (res.isErr()) {
		return err(res.error);
	}

	if (res.value.status != 200) {
		return err(res.value);
	}

	const parse_as = z.array(ZDiscordGuild);
	const parsed = parse_as.safeParse(await res.value.json());

	if (parsed.error) {
		return err(parsed.error);
	}

	return ok(parsed.data);
}

export async function load({ locals }) {
	const session = await locals.auth();

	if (!session?.access_token) {
		return {
			guilds: []
		};
	}

	const key = `${session.access_token}:guilds`;
	const parsed = await get_cached_or(
		key,
		z.array(ZDiscordGuild),
		() => get_guilds(session.access_token!),
		500
	);

	if (parsed.isErr()) {
		console.log(parsed.error);
		return error(500, "Could not query discord's API for your guilds");
	}

	const guilds = parsed.value;

	const guilds_res = await api_fetch('/guilds/viewable', {
		body: JSON.stringify(guilds.map((g) => g.id)),
		method: 'POST'
	});

	if (guilds_res.isErr()) {
		return error(500, 'could not query internal API for guilds');
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
