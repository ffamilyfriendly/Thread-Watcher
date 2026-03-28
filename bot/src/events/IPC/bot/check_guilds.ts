import { client } from '@providers/client';
import { PrivateEvent } from 'interfaces/PrivateEvents';
import { err, ok } from 'neverthrow';

const event: PrivateEvent<string[]> = {
  event_name: 'check_guilds',
  async event_callback(guild_list) {
    const this_instance_has_guilds = guild_list.filter((id) => client.guilds.cache.has(id));
    return ok(this_instance_has_guilds);
  },
};

export default event;
