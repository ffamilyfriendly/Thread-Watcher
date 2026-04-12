import { define_secure_event } from '#/interfaces/PrivateEvents';
import { ok } from 'neverthrow';
import { AppEventKey, AppEventMap } from '#/events/bus';
import { send_audit } from '#/utilities/send_audit_log';

export default define_secure_event('bus_event', (audit_event) => {
  const { event_key, ...rest } = audit_event;
  const key_typed = event_key as AppEventKey;
  const event = rest as AppEventMap[typeof key_typed];
  send_audit(key_typed, event);
  return ok();
});
