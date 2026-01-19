import get_database_instance from 'database';
import config from './config';
import { create_singleton } from './singleton';

const singleton = create_singleton(() => get_database_instance(config.instance));
export default singleton;
export const database = singleton.instance;
