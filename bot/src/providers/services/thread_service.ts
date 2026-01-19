import ThreadService from 'services/ThreadService';
import { create_singleton } from '../singleton';
import database from '../database';
import redis from '../redis';

const singleton = create_singleton(() => new ThreadService(database.instance, redis.instance));
export default singleton;
export const thread_service = singleton.instance;
