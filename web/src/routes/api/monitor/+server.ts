import { json_fetch } from '$lib/server/api';
import { check_ratelimit } from '$lib/server/ratelimit';
import { ZMonitor, ZEditMonitor } from '@watcher/shared';
import z from 'zod';
import { with_query_auth, with_schema_auth } from '$lib/server/api_helper.js';

export async function POST(event) {
	return with_schema_auth(
		event,
		ZMonitor.omit({ manages_threads_count: true }),
		async (data, user_id) => {
			await check_ratelimit(user_id, 5, 10);
			return json_fetch(`/guild/${data.guild_id}/monitors`, {
				body: JSON.stringify(data),
				method: 'POST',
				user_id
			});
		}
	);
}

export async function GET(event) {
	return with_query_auth(event, ['guild_id', 'monitor_id'], async (data, user_id) => {
		return await json_fetch(
			`/guild/${data.guild_id}/${data.monitor_id}`,
			{
				user_id
			},
			ZMonitor
		);
	});
}

export async function PATCH(event) {
	const schema = z.object({
		guild_id: z.string(),
		monitor_id: z.string(),
		edit: ZEditMonitor
	});
	return with_schema_auth(event, schema, async (data, user_id) => {
		await check_ratelimit(user_id, 5, 10);
		return json_fetch(`/guild/${data.guild_id}/monitors/${data.monitor_id}`, {
			body: JSON.stringify(data.edit),
			method: 'PATCH',
			user_id
		});
	});
}

export async function DELETE(event) {
	return with_query_auth(event, ['guild_id', 'monitor_id'], async (data, user_id) => {
		await check_ratelimit(user_id, 5, 10);
		return await json_fetch(`/guild/${data.guild_id}/monitors/${data.monitor_id}`, {
			method: 'DELETE',
			user_id
		});
	});
}
