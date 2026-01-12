import { PrivateEvent } from 'interfaces/PrivateEvents';
import { PartialAuditObject } from 'services/AuditService';
import { log_event_in_log_channel } from 'utilities/log_channel_stuff';

const event: PrivateEvent<PartialAuditObject> = {
  event_name: 'audit_log',
  async event_callback(audit) {
    return await log_event_in_log_channel(audit);
  },
};

export default event;
