import logger from '@providers/logger';
import guild_service from '@providers/services/guild_service';
import { Guild } from 'discord.js';
import { Event } from '#/interfaces/ClientEvent';

const event: Event<Guild> = {
  event_name: 'guildCreate',
  async event_callback(guild) {
    const guild_nullify_left_at = await guild_service.instance.nullify_left_at(guild.id);
    if (guild_nullify_left_at.isErr()) {
      logger.instance.error(
        `Could not unmark guild '${guild.id}' as left!`,
        guild_nullify_left_at.error,
      );
    }
  },
};

export default event;
