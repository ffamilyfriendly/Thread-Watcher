import { ipc_client, sharding_manager } from 'index';
import { PrivateEvent } from 'interfaces/PrivateEvents';
import { ok } from 'neverthrow';

const event: PrivateEvent = {
  event_name: 'reload',
  event_callback(n) {
    ipc_client.send_all('reload', null);
    return ok();
  },
};

export default event;
