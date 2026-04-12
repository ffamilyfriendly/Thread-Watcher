import { ResultAsync } from 'neverthrow';
import { redis_client } from './cache';
import { error } from '@sveltejs/kit';
import { map_err } from '$lib/error_helper';

export async function check_ratelimit(
	identifier: string | string[],
	limit: number,
	window_seconds: number
) {
	const ident = Array.isArray(identifier) ? identifier.join(':') : identifier;
	const key = `ratelimit:${ident}`;

	const results = await redis_client.pipeline().incr(key).expire(key, window_seconds, 'NX').exec();

	if (!results) throw error(500, 'Redis pipeline failed');
	const [incrError, count] = results[0] as [Error | null, number];

	if (incrError) {
		console.error('Ratelimit Redis Error:', incrError);
		return;
	}

	if (count > limit) {
		throw error(429, {
			message: 'Ratelimits reached'
		});
	}
}

export function check_ratelimit_safe(
	identifier: string | string[],
	limit: number,
	window_seconds: number
) {
	const chk = check_ratelimit(identifier, limit, window_seconds);
	return ResultAsync.fromPromise(chk, map_err);
}
