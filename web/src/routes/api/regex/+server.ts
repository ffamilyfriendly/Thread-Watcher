import { json_fetch } from '$lib/server/api.js';
import { with_schema_auth } from '$lib/server/api_helper.js';
import { check_ratelimit } from '$lib/server/ratelimit';
import { ZAiRegexResponse } from '@watcher/shared';
import z from 'zod';

export function POST(event) {
	return with_schema_auth(
		event,
		ZAiRegexResponse.extend({ guild_id: z.string() }),
		async (data, user_id) => {
			await check_ratelimit([user_id, 'ai_regex'], 5, 10);
			return await json_fetch(`/guild/${data.guild_id}/monitors/generate_regex`, {
				user_id,
				body: JSON.stringify(data),
				method: 'POST'
			});
		}
	);
}
