import { api_fetch, json_fetch, safe_fetch } from '$lib/server/api.js';
import { DISCORD_CLIENT_ID, BOT_ADDED_URL } from '$env/static/private';
import { ZDiscordGuild, type DiscordGuild } from '$lib/types/discord.js';
import z from 'zod';
import { error } from '@sveltejs/kit';
import { get_cached, get_cached_or } from '$lib/server/cache';
import { err, Result, ok } from 'neverthrow';
import {
	ZAuditLog,
	ZAuditLogResponse,
	ZDiscordUser,
	ZExpandedAuditLog,
	type AuditLog,
	type DiscordUser,
	type ExpandedAuditLog
} from '$lib/types/internal_api';

async function fetch_audit_logs(guild_id: string, user_id: string, before_id?: string | null) {
	let url_api = `/guilds/${guild_id}/audit`;
	if (before_id && !Number.isNaN(before_id)) url_api += `?before_id=${before_id}`;

	const audit_res = await json_fetch(url_api as `/${string}`, { user_id }, ZAuditLogResponse);

	if (audit_res.isErr()) {
		return err(audit_res.error);
	}

	return ok(audit_res.value);
}

async function fetch_discord_users(guild_id: string, user_id: string, users: string[]) {
	const users_res = await json_fetch(
		`/users/batch`,
		{
			method: 'POST',
			user_id,
			body: JSON.stringify({
				guild_id,
				user_ids: users
			})
		},
		z.array(ZDiscordUser)
	);

	if (users_res.isErr()) {
		return err(users_res.error);
	}

	return ok(users_res.value);
}

const ZExtendedResult = z.object({
	next_cursor: z.number().nullish(),
	logs: z.array(ZExpandedAuditLog)
});
type ExtendedResult = z.output<typeof ZExtendedResult>;

async function fetch_extended_audit(
	guild_id: string,
	user_id: string,
	before_id?: string | null
): Promise<Result<ExtendedResult, unknown>> {
	const audit_res = await fetch_audit_logs(guild_id, user_id, before_id);

	if (audit_res.isErr()) {
		return err(audit_res.error);
	}

	const users = new Set(audit_res.value.logs.map((audit) => audit.executor_id));

	console.log('fetching users...');
	const users_res = await fetch_discord_users(guild_id, user_id, Array.from(users));

	if (users_res.isErr()) {
		return err(users_res.error);
	}

	const audit_objs = audit_res.value.logs as any as ExpandedAuditLog[];
	for (const audit of audit_objs) {
		const user = users_res.value.find((u) => u.id === audit.executor_id);
		if (!user) {
			console.error('COULD NOT FIND USER', audit.executor_id);
			continue;
		}
		audit.executing_user = user;
	}

	return ok({
		logs: audit_objs,
		next_cursor: audit_res.value.next_cursor
	});
}

export async function load({ locals, params, url }) {
	const auth = await locals.auth();
	const guild_id = params.guild;
	const before_id = url.searchParams.get('before_id');

	let data_result;
	if (!before_id) {
		data_result = fetch_extended_audit(guild_id, auth?.user.id!, before_id);
	} else {
		data_result = get_cached_or(
			`audit:${guild_id}:${before_id}`,
			ZExtendedResult,
			() => fetch_extended_audit(guild_id, auth?.user.id!, before_id),
			500
		);
	}
	data_result = await data_result;

	if (data_result.isErr()) {
		console.error(data_result.error);
		return error(500, 'sum ting wong');
	}

	return {
		logs: data_result.value
	};
}
