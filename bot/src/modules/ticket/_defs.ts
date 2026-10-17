import { ResultType } from '#/interfaces/Module';
import { Message } from 'discord.js';

export interface MessageReciever {
  on_message: (msg: {
    user_id: string;
    content: string;
    channel_id: string;
    message_id: string;
  }) => ResultType;
}
