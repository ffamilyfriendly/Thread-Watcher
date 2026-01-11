import {
	ZAuditLogResponse,
	ZDiscordChannel,
	ZDiscordRole,
	ZDiscordUser,
	ZExpandedAuditLog,
	type ExpandedAuditLog
} from '$lib/types/internal_api';
import z from 'zod';
import { json_fetch } from './api';
import { err, ok, Result } from 'neverthrow';
import { get_cached_or } from './cache';

export async function fetch_audit_logs(
	guild_id: string,
	user_id: string,
	before_id?: string | null
) {
	let url_api = `/guilds/${guild_id}/audit`;
	if (before_id && !Number.isNaN(before_id)) url_api += `?before_id=${before_id}`;

	const audit_res = await json_fetch(url_api as `/${string}`, { user_id }, ZAuditLogResponse);

	if (audit_res.isErr()) {
		return err(audit_res.error);
	}

	return ok(audit_res.value);
}

export async function fetch_discord_users(guild_id: string, user_id: string, users: string[]) {
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

export const ZExtendedResult = z.object({
	next_cursor: z.number().nullish(),
	logs: z.array(ZExpandedAuditLog)
});
export type ExtendedResult = z.output<typeof ZExtendedResult>;

export async function fetch_extended_audit(
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

export async function _fetch_channel(guild_id: string, user_id: string, channel_id: string) {
	const users_res = await json_fetch(
		`/guilds/${guild_id}/channel/${channel_id}`,
		{
			user_id
		},
		ZDiscordChannel
	);

	if (users_res.isErr()) return err(users_res.error);

	return ok(users_res.value);
}

export function fetch_channel(guild_id: string, user_id: string, channel_id: string) {
	return get_cached_or(
		`dash:${guild_id}:${channel_id}`,
		ZDiscordChannel,
		() => _fetch_channel(guild_id, user_id, channel_id),
		500
	);
}

export async function _fetch_role(guild_id: string, user_id: string, role_id: string) {
	const users_res = await json_fetch(
		`/guilds/${guild_id}/role/${role_id}`,
		{
			user_id
		},
		ZDiscordRole
	);

	if (users_res.isErr()) return err(users_res.error);

	return ok(users_res.value);
}

export function fetch_role(guild_id: string, user_id: string, role_id: string) {
	return get_cached_or(
		`dash:${guild_id}:${role_id}`,
		ZDiscordRole,
		() => _fetch_role(guild_id, user_id, role_id),
		500
	);
}
