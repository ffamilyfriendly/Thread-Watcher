import { Client, Shard, ShardingManager } from 'discord.js';
import { BaseEvent, Callback, ReponseEvent } from 'interfaces/PrivateEvents';
import { randomBytes } from 'crypto';
import { err } from 'neverthrow';

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

type Sender = {
  send: (message: unknown) => void;
};

export class PrivateInteraction {
  sender: Sender;
  request_id: string;

  constructor(sender: Sender, request_id: string) {
    this.sender = sender;
    this.request_id = request_id;
  }

  reply(status: boolean, data: unknown) {
    this.sender.send({ ok: status, request_id: this.request_id, data, type: 'response' });
  }
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

  on(event: string, callback: Callback<unknown>) {
    this.listeners.set(event, callback);
  }

  _send(shard: Shard, event: string, data: unknown, callback: ResponseCallback) {
    const request = generate_message(event, data);

    shard.send(request);
    this.response_events.set(request.request_id, callback);
  }
}

export class BotIpcClient extends BaseClient {
  discord_client: Client;

  constructor(client: Client) {
    super();
    this.discord_client = client;
  }
}

export class ShardedIpcClient extends BaseClient {
  manager: ShardingManager;
  shards = new Map<number, Shard>();

  constructor(manager: ShardingManager) {
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

  send_to_shard(shard_id: number, event: string, data: unknown) {
    const shard = this.shards.get(shard_id);

    if (!shard) return err(new Error(`shard "${shard_id}" does not exist`));

    this._send(shard, event, data, () => {});
  }

  send_all(event: string, data: unknown) {
    this.shards.forEach((shard) => {
      this._send(shard, event, data, () => {});
    });
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
