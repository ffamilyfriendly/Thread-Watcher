import { create_singleton } from '@providers/singleton';
import { entitlement_service } from './entitlement_service';
import LibraryService from '#/services/AI/LibraryService';
import { ai_service } from './ai_service';
import { database } from '@providers/database';
import { redis } from '@providers/redis';

const singleton = create_singleton(() => new LibraryService(database, redis, entitlement_service));
export default singleton;
export const lib_service = singleton.instance;
