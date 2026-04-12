import { ipc_client } from '@providers/ipc/shard_mgr_ipc_client';
import { PrivateEvent } from '#/interfaces/PrivateEvents';
import { ok } from 'neverthrow';

const event: PrivateEvent = {
  event_name: 'reload',
  event_callback(n) {
    ipc_client.send_all('reload', null);
    return ok();
  },
};

export default event;
