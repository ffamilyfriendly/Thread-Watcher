import Redis from 'ioredis';
import { create_singleton } from './singleton';

const singleton = create_singleton(() => new Redis());
export default singleton;
export const redis = singleton.instance;
