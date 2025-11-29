import { Message } from 'discord.js';
import { logger, thread_service } from 'bot';
import { Event } from 'interfaces/ClientEvent';

async function check_msg_should_bump_thread(msg: Message) {
  if (!msg.channel.isThread()) return;
  const res_thread = (await thread_service.get_thread(msg.channelId)).match(
    (value) => value,
    (err_value) => {
      logger.error('could not fetch thread from db: ', err_value);
      return null;
    },
  );

  if (res_thread) thread_service.bump_thread_time(msg.channel);
}

const event: Event<Message> = {
  event_name: 'messageCreate',
  async event_callback(msg) {
    check_msg_should_bump_thread(msg);
  },
};

export default event;
