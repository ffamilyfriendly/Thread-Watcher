import { Message, ThreadChannel } from 'discord.js';
import { Result } from 'neverthrow';
import { Logger } from 'tslog';

type LoggerType = Logger<unknown>;

export interface Module {
  name: string;

  // Thread Stuff
  on_thread_update?: (
    old: ThreadChannel,
    now: ThreadChannel,
    logger: LoggerType,
  ) => Promise<Result<void, Error>>;
  on_thread_create?: (thread: ThreadChannel, logger: LoggerType) => Promise<Result<void, Error>>;
  on_thread_delete?: (thread: ThreadChannel, logger: LoggerType) => Promise<Result<void, Error>>;

  // Message Stuff
  on_message_create?: (message: Message, logger: LoggerType) => Promise<Result<void, Error>>;
}
