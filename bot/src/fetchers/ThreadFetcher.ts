import { Client, ThreadChannel } from 'discord.js';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { ShardedIpcClient } from 'utilities/ipc_clients';

export interface ThreadFetcher {
  fetch_thread_details(guild_id: string, thread_id: string): Promise<Result<ThreadChannel, Error>>;
}

export class BotContextThreadFetcher implements ThreadFetcher {
  constructor(private client: Client) {}

  async fetch_thread_details(
    _guild_id: string,
    thread_id: string,
  ): Promise<Result<ThreadChannel, Error>> {
    const thread_result = await ResultAsync.fromPromise(
      this.client.channels.fetch(thread_id),
      (e) => e,
    );

    if (thread_result.isErr()) {
      const error =
        thread_result.error instanceof Error
          ? thread_result.error
          : new Error('could not fetch thread');
      return err(error);
    }
    if (!(thread_result.value instanceof ThreadChannel))
      return err(new Error(`${thread_id} not instance of ThreadChannel`));

    return ok(thread_result.value);
  }
}

export class IndexContextThreadFetcher implements ThreadFetcher {
  constructor(private client: ShardedIpcClient) {}

  async fetch_thread_details(
    guild_id: string,
    thread_id: string,
  ): Promise<Result<ThreadChannel, Error>> {
    const response = await this.client.send_to_shard_having_guild<ThreadChannel>(
      guild_id,
      'FETCH_THREAD',
      { thread_id },
    );

    if (response.isErr()) {
      const error =
        response.error instanceof Error ? response.error : new Error('could not fetch thread');
      return err(error);
    }

    return ok(response.value);
  }
}
