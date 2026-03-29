import database from '@providers/database';
import { create_singleton } from '@providers/singleton';
import AuditService from 'services/AuditService';

const singleton = create_singleton(() => {
  const audit_service = new AuditService(database.instance);
  audit_service.init();
  return audit_service;
});
export default singleton;
export const audit_service = singleton.instance;
