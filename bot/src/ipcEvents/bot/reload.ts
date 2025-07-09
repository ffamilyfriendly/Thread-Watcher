import { load_commands, logger } from 'bot';
import { PrivateEvent } from 'interfaces/PrivateEvents';

const event: PrivateEvent = {
  event_name: 'reload',
  event_callback(_GAGNAMSTYLE, interaction) {
    logger.debug('reloading commands!');
    load_commands(true);
    interaction.reply(true, { ok: true });
  },
};

export default event;
