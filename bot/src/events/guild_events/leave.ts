import { Guild } from 'discord.js';
import { guild_service, logger } from 'bot';
import { Event } from 'interfaces/ClientEvent';

const event: Event<Guild> = {
  event_name: 'guildDelete',
  async event_callback(guild) {
    const guild_left_res = await guild_service.set_left_at(guild.id);
    if (guild_left_res.isErr()) {
      logger.error(`Could not mark guild '${guild.id}' as left_as`, guild_left_res.error);
    } else {
      logger.debug(`Bot left guild ${guild.name} (${guild.id})`);
    }
  },
};

export default event;
