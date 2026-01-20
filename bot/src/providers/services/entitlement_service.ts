import { database } from '@providers/database';
import { redis } from '@providers/redis';
import { create_singleton } from '@providers/singleton';
import EntitlementService from 'services/EntitlementService';

const singleton = create_singleton(() => new EntitlementService(database, redis));
export default singleton;
export const entitlement_service = singleton.instance;
