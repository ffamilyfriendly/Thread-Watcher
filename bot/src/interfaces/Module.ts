import { Interaction, Message, ThreadChannel } from 'discord.js';
import { Result } from 'neverthrow';
import { Logger } from 'tslog';

type LoggerType = Logger<unknown>;

export type ResultType = Promise<Result<unknown, Error | unknown>>;

export interface Module {
  name: string;

  // Thread Stuff
  on_thread_update?: (old: ThreadChannel, now: ThreadChannel, logger: LoggerType) => ResultType;
  on_thread_create?: (thread: ThreadChannel, logger: LoggerType) => ResultType;
  on_thread_delete?: (thread: ThreadChannel, logger: LoggerType) => ResultType;

  on_interaction?: (interaction: Interaction, logger: LoggerType) => ResultType;

  // Message Stuff
  on_message_create?: (message: Message, logger: LoggerType) => ResultType;
}
