import { json_fetch } from '$lib/server/api.js';
import { with_api_auth, with_query_auth, with_schema_auth } from '$lib/server/api_helper.js';
import { fetch_entitlements } from '$lib/server/data_fetchers.js';
import { check_ratelimit } from '$lib/server/ratelimit';
import { ZAiRegexResponse } from '@watcher/shared';
import z from 'zod';

export async function GET({ params, locals, request }) {
	json_fetch(`/guilds/guild/${params.guild_id}/subscription`);
	return with_api_auth({ locals, request }, {}, (_d, user_id) => {
		return fetch_entitlements(params.guild_id, user_id);
	});
}
