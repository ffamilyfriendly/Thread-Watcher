import { sharding_manager } from 'index';
import { PrivateEvent } from 'interfaces/PrivateEvents';

const event: PrivateEvent = {
  event_name: 'reload',
  event_callback(_fuck, interaction) {
    sharding_manager.shards.forEach((s) => {
      s.send({
        type: 'reload',
      });
    });

    interaction.reply(true, { ok: true });
  },
};

export default event;
