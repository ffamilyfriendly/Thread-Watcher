import logger from '@providers/logger';
import guild_service from '@providers/services/guild_service';
import { Guild } from 'discord.js';
import { Event } from '#/interfaces/ClientEvent';

const event: Event<Guild> = {
  event_name: 'guildDelete',
  async event_callback(guild) {
    const guild_left_res = await guild_service.instance.set_left_at(guild.id);
    if (guild_left_res.isErr()) {
      logger.instance.error(`Could not mark guild '${guild.id}' as left_as`, guild_left_res.error);
    } else {
      logger.instance.debug(`Bot left guild ${guild.name} (${guild.id})`);
    }
  },
};

export default event;
