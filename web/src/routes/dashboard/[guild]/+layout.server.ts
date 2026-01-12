import { json_fetch, safe_fetch } from '$lib/server/api';
import { get_cached_or } from '$lib/server/cache.js';
import { map_err } from '$lib/error_helper.js';
import {} from '$lib/types/discord';
import {
	ZDiscordChannel,
	ZDiscordRole,
	ZGuildOverview,
	type DiscordChannel,
	type DiscordRole,
	type GuildOverview
} from '$lib/types/internal_api';
import { error } from '@sveltejs/kit';
import { err, ok, ResultAsync, type Result } from 'neverthrow';
import z from 'zod';
import { get_guild_info } from '$lib/server/data_fetchers';

async function get_channels(
	guild_id: string,
	user_id: string
): Promise<Result<DiscordChannel[], Error | Response>> {
	const res = await json_fetch(
		`/guilds/${guild_id}/channels`,
		{ user_id },
		z.array(ZDiscordChannel)
	);

	if (res.isErr()) {
		return err(res.error);
	}

	return ok(res.value);
}

async function get_roles(
	guild_id: string,
	user_id: string
): Promise<Result<DiscordRole[], Error | Response>> {
	const res = await json_fetch(`/guilds/${guild_id}/roles`, { user_id }, z.array(ZDiscordRole));

	if (res.isErr()) {
		return err(res.error);
	}

	return ok(res.value);
}

export async function load({ locals, params }) {
	const guild_id = params.guild;
	const auth = await locals.auth();

	if (!auth?.user.id) {
		return error(401, 'not authorized');
	}

	const channels_promise = get_cached_or(
		`${guild_id}:channels`,
		z.array(ZDiscordChannel),
		() => get_channels(guild_id, auth.user.id),
		500
	);
	const roles_promise = get_cached_or(
		`${guild_id}:roles`,
		z.array(ZDiscordRole),
		() => get_roles(guild_id, auth.user.id),
		500
	);

	const guild_info_promise = get_cached_or(
		`${guild_id}:overviewInfo`,
		ZGuildOverview,
		() => get_guild_info(guild_id, auth.user.id),
		500
	);

	const promises = await ResultAsync.fromPromise(
		Promise.all([channels_promise, roles_promise, guild_info_promise]),
		map_err
	);

	if (promises.isErr()) {
		return error(500, 'could not get channels or roles');
	}

	const [channels, roles, guild] = promises.value;

	if (channels.isErr()) {
		console.log('CANT GET CHANNELS', channels.error);
		return error(500, 'could not get channels');
	}

	if (roles.isErr()) {
		console.log(roles.error);
		return error(500, 'could not get roles');
	}

	if (guild.isErr()) {
		console.log(guild.error);
		return error(500, 'could not get guild info');
	}

	return {
		channels: channels.value,
		roles: roles.value,
		guild: guild.value,
		guild_id
	};
}
