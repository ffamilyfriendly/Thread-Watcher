import Redis from 'ioredis';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { number, z } from 'zod';
import { map_err } from './error';

async function safe_get<TZodType extends z.ZodType>(
  redis: Redis,
  key: string,
  schema: TZodType,
  null_returns_ok = true,
): Promise<Result<z.output<TZodType> | null, Error>> {
  const data = await ResultAsync.fromPromise(redis.get(key), map_err);
  if (data.isErr()) return err(data.error);
  if (!data.value && null_returns_ok) return ok(null);
  else if (!data.value) return err(new Error('redis returned null'));

  const parsed_json = Result.fromThrowable(() => JSON.parse(data.value!), map_err)();
  if (parsed_json.isErr()) return err(parsed_json.error);

  const schema_res = schema.safeParse(parsed_json.value);
  if (!schema_res.success) return err(schema_res.error);

  return ok(schema_res.data);
}

async function safe_write<TZodType extends z.ZodType>(
  redis: Redis,
  key: string,
  data: unknown,
  schema: TZodType,
  expiry: number,
) {
  const schema_res = schema.safeParse(data);
  if (!schema_res.success) return err(schema_res.error);

  return ResultAsync.fromPromise(
    redis.set(key, JSON.stringify(schema_res.data), 'EX', expiry),
    map_err,
  );
}

export default class RedisWrapper {
  constructor(
    private redis: Redis,
    readonly default_expiry: number,
    readonly prefix: string,
  ) {}

  get_key(key: string | string[]) {
    return this.prefix + ':' + (typeof key === 'string' ? key : key.join(':'));
  }

  get<TZodType extends z.ZodType>(key: string | string[], schema: TZodType) {
    const k = this.get_key(key);
    return safe_get(this.redis, k, schema);
  }

  private get default_get_cached_or() {
    return {
      expiry: this.default_expiry,
      should_cache_null: true,
    };
  }

  async get_cached_or<TZodType extends z.ZodType>(
    key: string | string[],
    schema: TZodType,
    on_cache_miss: () => Promise<Result<z.output<TZodType>, Error>>,
    options?: Partial<typeof this.default_get_cached_or>,
  ): Promise<Result<z.output<TZodType>, Error>> {
    const opts = { ...this.default_get_cached_or, ...options };

    const cache_hit = await this.get(key, schema);
    if (cache_hit.isOk() && cache_hit.value) return ok(cache_hit.value);

    const fresh_response = await on_cache_miss();
    if (fresh_response.isErr()) return err(fresh_response.error);

    if ((!fresh_response.value && opts.should_cache_null) || fresh_response.value)
      this.set(key, fresh_response.value, schema, opts.expiry);

    return ok(fresh_response.value);
  }

  get_non_nullable<TZodType extends z.ZodType>(key: string | string[], schema: TZodType) {
    const k = this.get_key(key);
    return safe_get(this.redis, k, schema, false);
  }

  set<TZodType extends z.ZodType>(
    key: string | string[],
    data: unknown,
    schema: TZodType,
    expiry: number = this.default_expiry,
  ) {
    const k = this.get_key(key);
    return safe_write(this.redis, k, data, schema, expiry);
  }

  del(key: string | string[]) {
    return ResultAsync.fromPromise(this.redis.del(this.get_key(key)), map_err);
  }
}
