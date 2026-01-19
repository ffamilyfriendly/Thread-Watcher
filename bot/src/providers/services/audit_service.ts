import database from '@providers/database';
import { create_singleton } from '@providers/singleton';
import AuditService from 'services/AuditService';

const singleton = create_singleton(() => new AuditService(database.instance));
export default singleton;
export const audit_service = singleton.instance;
