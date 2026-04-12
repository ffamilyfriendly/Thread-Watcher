import database from '@providers/database';
import redis from '@providers/redis';
import { create_singleton } from '@providers/singleton';
import GuildService from '#/services/GuildService';

const singleton = create_singleton(() => new GuildService(database.instance, redis.instance));
export default singleton;
export const guild_service = singleton.instance;
