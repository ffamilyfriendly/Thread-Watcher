import database from '@providers/database';
import redis from '@providers/redis';
import { create_singleton } from '@providers/singleton';
import ChannelService from 'services/ChannelService';

const singleton = create_singleton(() => new ChannelService(database.instance, redis.instance));
export default singleton;

export const channel_service = singleton.instance;
