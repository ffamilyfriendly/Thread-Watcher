import { ThreadChannel } from 'discord.js';
import { Event } from 'interfaces/ClientEvent';
import { check_should_be_watched } from './threadUpdate';
import Logger from '@providers/logger';

const event: Event<ThreadChannel> = {
  event_name: 'threadCreate',
  async event_callback(thread) {
    check_should_be_watched(thread, Logger.child('THREAD_CREATE'));
  },
};

export default event;
