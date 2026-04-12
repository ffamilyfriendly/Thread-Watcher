import SettingService from '#/services/SettingService';
import { create_singleton } from '../singleton';
import database from '../database';
import redis from '../redis';

const singleton = create_singleton(() => new SettingService(database.instance, redis.instance));
export default singleton;
export const setting_service = singleton.instance;
