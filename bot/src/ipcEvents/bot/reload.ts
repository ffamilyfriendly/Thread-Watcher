import { commands } from '@providers/commands';
import { logger } from '@providers/logger';
import { PrivateEvent } from 'interfaces/PrivateEvents';
import { err, ok } from 'neverthrow';
import { load_commands } from 'utilities/file_loaders';

const event: PrivateEvent = {
  event_name: 'reload',
  async event_callback(_GAGNAMSTYLE) {
    logger.debug('reloading commands!');
    const res = await load_commands(commands, true);

    if (res.isOk()) {
      return ok();
    } else {
      return err(res.error);
    }
  },
};

export default event;
