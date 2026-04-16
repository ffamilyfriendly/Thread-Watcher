import Redis from 'ioredis';
import type z from 'zod';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { map_err } from '../error_helper';

export const redis_client = new Redis();

export async function get_cached_or<T>(
	key: string,
	schema: z.ZodType<T>,
	fallback: () => Result<T, Error> | Promise<Result<T, unknown>>,
	expires_seconds = 60 * 5
) {
	const cache_result = await get_cached<T>(key, schema);

	if (cache_result.isErr()) {
		console.error('cache failed', cache_result.error);
	}

	if (cache_result.isOk() && cache_result.value) {
		return ok(cache_result.value);
	}

	const fallback_res = await fallback();
	if (fallback_res.isErr()) return err(fallback_res.error);

	const write_res = await set_cached(key, fallback_res.value, expires_seconds);
	if (write_res.isErr()) return err(write_res.error);

	return ok(fallback_res.value);
}

export async function get_cached<T>(
	key: string,
	schema: z.ZodType<T>
): Promise<Result<T | null, Error>> {
	const cache_result = await ResultAsync.fromPromise(redis_client.get(key), map_err);

	if (cache_result.isErr()) {
		return err(cache_result.error);
	}

	if (!cache_result.value) return ok(null);

	const as_schema = schema.safeParse(JSON.parse(cache_result.value));

	if (!as_schema.success) {
		redis_client.del(key);
		return err(as_schema.error);
	}

	return ok(as_schema.data);
}

export async function del_from_cache(id: string) {
	return ResultAsync.fromPromise(redis_client.del(id), map_err);
}

export async function set_cached(
	key: string,
	data: unknown,
	expires_seconds: number
): Promise<Result<'OK', Error>> {
	const safe_stringify = Result.fromThrowable(JSON.stringify);
	const stringified_res = safe_stringify(data);

	if (stringified_res.isErr()) return err(map_err(stringified_res.error));
	return ResultAsync.fromPromise(
		redis_client.set(key, stringified_res.value, 'EX', expires_seconds),
		map_err
	);
}
