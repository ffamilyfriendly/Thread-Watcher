import { Guild } from 'discord.js';
import { guild_service, logger } from 'bot';
import { Event } from 'interfaces/ClientEvent';

const event: Event<Guild> = {
  event_name: 'guildCreate',
  async event_callback(guild) {
    const guild_nullify_left_at = await guild_service.nullify_left_at(guild.id);
    if (guild_nullify_left_at.isErr()) {
      logger.error(`Could not unmark guild '${guild.id}' as left!`, guild_nullify_left_at.error);
    }
  },
};

export default event;
