import { sharding_manager } from 'index';
import { PrivateEvent } from 'interfaces/PrivateEvents';
import { ok } from 'neverthrow';

const event: PrivateEvent = {
  event_name: 'reload',
  event_callback(n) {
    sharding_manager.shards.forEach((s) => {
      s.send({
        type: 'reload',
      });
    });

    return ok();
  },
};

export default event;
