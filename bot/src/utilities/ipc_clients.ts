import { Client, Shard, ShardClientUtil, ShardingManager } from 'discord.js';
import { BaseEvent, Callback, ReponseEvent } from 'interfaces/PrivateEvents';
import { randomBytes } from 'crypto';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import Redis from 'ioredis';
import { map_err } from './error';
import z from 'zod';
import { with_schema } from 'database';
import { ZAuditData, ZDiscordUser, ZPublicTicketMessage } from '@watcher/shared';

interface EnsuredSchemaCall<E extends z.ZodType, R extends z.ZodType> {
  event_name: string;
  return_schema: R;
  expected_data: E;
}

export const FUNCS = {
  send_embed: {
    event_name: 'send_embed',
    expected_data: z.object({ panel_id: z.string() }),
    return_schema: z.object({ message_id: z.string() }),
  },
  fetch_users: {
    event_name: 'fetch_users',
    expected_data: z.object({ user_ids: z.array(z.string()), guild_id: z.string() }),
    return_schema: z.array(ZDiscordUser),
  },
  user_has_role: {
    event_name: 'user_has_role',
    expected_data: z.object({
      role_ids: z.array(z.string()),
      guild_id: z.string(),
      user_id: z.string(),
    }),
    return_schema: z.boolean(),
  },
  mark_ticket_resolved: {
    event_name: 'mark_ticket_resolved',
    expected_data: z.object({
      ticket_id: z.string(),
      user_id: z.string(),
    }),
    return_schema: z.void(),
  },
  bus_event: {
    event_name: 'bus_event',
    expected_data: ZAuditData.omit({ id: true, timestamp: true }).extend({ event_key: z.string() }),
    return_schema: z.void(),
  },
} satisfies Record<string, EnsuredSchemaCall<z.ZodType, z.ZodType>>;

function generate_request_id() {
  return randomBytes(16).toString('hex');
}

function generate_message(event: string, data: unknown): BaseEvent {
  return {
    request_id: generate_request_id(),
    type: event,
    data,
  };
}

interface IpcClient {
  on: (event: string, callback: Callback<unknown>) => void;
}

interface ShardedBaseEvent extends BaseEvent, ReponseEvent {
  shard: Shard;
}

type ResponseCallback = (ev: ReponseEvent) => void;

class BaseClient implements IpcClient {
  listeners = new Map<string, Callback<unknown>>();
  response_events = new Map<string, ResponseCallback>();
  request_timeout_after_ms = 1000 * 3;

  on(event: string, callback: Callback<unknown>) {
    this.listeners.set(event, callback);
  }

  protected ensure_schema(data: ShardedBaseEvent | BaseEvent) {
    const schema_config = FUNCS[data.type as keyof typeof FUNCS];
    if (!schema_config) return true;

    const parsed = schema_config.expected_data.safeParse(data.data);
    return parsed.success;
  }

  protected _send<T>(
    shard: Shard | ShardClientUtil,
    event: string,
    data: unknown,
    schema?: z.ZodType<T>,
  ): Promise<Result<T, unknown>> {
    return new Promise(async (resolve) => {
      const request = generate_message(event, data);

      const send_res = await ResultAsync.fromPromise(shard.send(request) as Promise<any>, map_err);

      if (send_res.isErr()) {
        return resolve(err(send_res.error));
      }

      const req_timeout = setTimeout(() => {
        this.response_events.delete(request.request_id);
        return resolve(err(new Error('Request Timed Out')));
      }, this.request_timeout_after_ms);

      this.response_events.set(request.request_id, (data) => {
        clearTimeout(req_timeout);
        this.response_events.delete(request.request_id);
        if (data.ok) {
          if (!schema) return resolve(ok(data.data as T));

          const as_parsed = schema.safeParse(data.data);
          if (as_parsed.success) return resolve(ok(as_parsed.data));

          resolve(err(as_parsed.error));
        } else {
          resolve(err(data.data));
        }
      });
    });
  }

  with_schema<K extends keyof typeof FUNCS>(
    shard: Shard | ShardClientUtil,
    key: K,
    data: z.input<(typeof FUNCS)[K]['expected_data']>,
  ) {
    const details = FUNCS[key];
    type ReturnSchema = (typeof FUNCS)[K]['return_schema'];
    const schema = details.return_schema as unknown as z.ZodType<z.output<ReturnSchema>>;
    return this._send<z.output<ReturnSchema>>(shard, details.event_name, data, schema);
  }
}

export class BotIpcClient extends BaseClient {
  discord_client: Client;
  shard: ShardClientUtil | null;

  constructor(client: Client) {
    super();
    this.discord_client = client;
    this.shard = client.shard;

    process.on('message', (data: BaseEvent) => {
      this._handle_message(data);
    });
  }

  send(event: string, data: unknown) {
    if (!this.shard) return err('no shard');
    return this._send(this.shard, event, data);
  }

  private async _handle_message(message: BaseEvent) {
    if (message.type === 'response') {
      const response_handler = this.response_events.get(message.request_id);
      if (!response_handler) return;

      response_handler(message as ReponseEvent);
    }

    const handler = this.listeners.get(message.type);
    if (handler) {
      if (!this.ensure_schema(message)) {
        return this.shard?.send({
          type: 'response',
          ok: false,
          data: 'IPC_SCHEMA_VALIDATION_FAILED',
          request_id: message.request_id,
        });
      }

      const result = await handler(message.data);

      if (result.isOk()) {
        this.shard?.send({
          type: 'response',
          ok: true,
          data: result.value,
          request_id: message.request_id,
        });
      } else {
        this.shard?.send({
          type: 'response',
          ok: false,
          data: result.error,
          request_id: message.request_id,
        });
      }
    }
  }
}

export class ShardedIpcClient extends BaseClient {
  manager: ShardingManager;
  shards = new Map<number, Shard>();
  static readonly CACHE_TTL_SECONDS = 900;

  constructor(
    manager: ShardingManager,
    private redis: Redis,
  ) {
    super();
    this.manager = manager;
    this.prepare();
  }

  prepare() {
    this.manager.shards.forEach((shard) => {
      if (this.shards.has(shard.id)) return;

      shard.on('message', (msg) => {
        const data = { ...msg, shard };
        this._handle_message(data);
      });

      this.shards.set(shard.id, shard);
    });
  }

  send_to_shard<T = unknown>(
    shard_id: number,
    event: string,
    data: unknown,
    schema?: z.ZodType<T>,
  ) {
    const shard = this.shards.get(shard_id);

    if (!shard) return err(new Error(`shard "${shard_id}" does not exist`));

    return this._send<T>(shard, event, data, schema);
  }

  async get_shard_from_guild_id(guild_id: string) {
    const REDIS_KEY = `GUILD:${guild_id}:SHARD`;
    const cached_value = await ResultAsync.fromPromise(this.redis.get(REDIS_KEY), (err) => err);

    if (cached_value.isOk() && cached_value.value) {
      return ok(Number.parseInt(cached_value.value));
    }

    const eval_result = await ResultAsync.fromPromise(
      this.manager.broadcastEval((c, { guildId }) => [c.shard?.ids, c.guilds.cache.has(guildId)], {
        context: { guildId: guild_id },
      }),
      (err) => err,
    );

    if (eval_result.isErr()) return err(eval_result.error);

    const found_shard = eval_result.value.find(
      (value): value is [number[], boolean] =>
        Array.isArray(value) && typeof value[1] == 'boolean' && value[1] && Array.isArray(value[0]),
    );

    if (!found_shard) return err(new Error(`no shard found for Guild ID: ${guild_id}`));

    const shard_id = found_shard[0][0];

    this.redis.set(REDIS_KEY, shard_id, 'EX', ShardedIpcClient.CACHE_TTL_SECONDS);

    return ok(shard_id);
  }

  async send_to_shard_having_guild<T = unknown>(
    guild_id: string,
    event: string,
    data: unknown,
    schema?: z.ZodType<T>,
  ) {
    const shard = await this.get_shard_from_guild_id(guild_id);

    if (shard.isErr()) return err(shard.error);

    return this.send_to_shard<T>(shard.value, event, data, schema);
  }

  async send_shard<T extends keyof typeof FUNCS>(
    guild_id: string,
    schema: T,
    data: z.input<(typeof FUNCS)[T]['expected_data']>,
  ) {
    const shard = await this.get_shard_from_guild_id(guild_id);
    if (shard.isErr()) return err(shard.error);

    const shard_obj = this.shards.get(shard.value);
    if (!shard_obj) return err(new Error(`shard "${shard_obj}" does not exist`));

    return this.with_schema(shard_obj, schema, data);
  }

  /**
   * Sends an IPC event to all shard instances and collects responses
   *
   * - returns an array of promises for each subsequent shard IPC call
   *
   * @param event event IPC event name
   * @param data data payload sent to each shard
   */
  send_all<T = unknown>(event: string, data: unknown): Promise<Result<T, unknown>>[] {
    const results: Promise<Result<T, unknown>>[] = [];
    this.shards.forEach((shard) => {
      const result = this._send<T>(shard, event, data);
      results.push(result);
    });
    return results;
  }

  /**
   * Sends an IPC event to all shard instances and collects responses.
   *
   * - Executes in parallel
   * - fails if any shard returns an error
   * - returns an array of successful results
   *
   * @param event event IPC event name
   * @param data data payload sent to each shard
   */
  async send_all_flat<T = unknown>(event: string, data: unknown) {
    const ipc_reqs = this.send_all(event, data);
    const r_safe = await ResultAsync.fromPromise(Promise.all(ipc_reqs), map_err);

    if (r_safe.isErr()) {
      return err(r_safe.error);
    }

    const contains_error = r_safe.value.find((r) => r.isErr());
    if (contains_error) return err(contains_error.error);

    return ok(r_safe.value.filter((r) => r.isOk()).map((r) => r.value as T));
  }

  private async _handle_message(message: ShardedBaseEvent) {
    if (message.type === 'response') {
      const response_handler = this.response_events.get(message.request_id);
      if (!response_handler) return;

      response_handler(message);
    }

    const handler = this.listeners.get(message.type);
    if (handler) {
      const result = await handler(message.data);

      if (result.isOk()) {
        message.shard.send({
          type: 'response',
          ok: true,
          data: result.value,
          request_id: message.request_id,
        });
      } else {
        message.shard.send({
          type: 'response',
          ok: false,
          data: result.error,
          request_id: message.request_id,
        });
      }
    }
  }
}
