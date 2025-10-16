import { Client } from 'discord.js';
import { logger } from 'bot';
import { Event } from 'interfaces/ClientEvent';

const event: Event<Client> = {
  event_name: 'clientReady',
  event_callback(client) {
    logger.debug(`Online as ${client.user?.username}`);
  },
};

export default event;
