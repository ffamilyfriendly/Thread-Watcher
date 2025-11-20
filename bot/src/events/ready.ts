import { Client } from 'discord.js';
import { logger } from 'bot';
import { Event } from 'interfaces/ClientEvent';
import { start_bumper_loop } from 'routines/bump_threads';

const event: Event<Client> = {
  event_name: 'clientReady',
  event_callback(client) {
    logger.debug(`Online as ${client.user?.username}`);

    // START ROUTINES DEPENDANT ON READY
    start_bumper_loop();
  },
};

export default event;
