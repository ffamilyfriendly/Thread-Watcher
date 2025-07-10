import { load_commands, logger } from 'bot';
import { PrivateEvent } from 'interfaces/PrivateEvents';
import { err, ok } from 'neverthrow';

const event: PrivateEvent = {
  event_name: 'reload',
  async event_callback(_GAGNAMSTYLE) {
    logger.debug('reloading commands!');
    const res = await load_commands(true);

    if (res.isOk()) {
      return ok();
    } else {
      return err(res.error);
    }
  },
};

export default event;
