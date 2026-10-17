import { get_dm_listener } from '#/modules/ticket/_on_message';
import { err, ok } from 'neverthrow';
import { define_typed_event } from '../../shared/typed_events';

export default define_typed_event('proxy_dm', async (c) => {
  const listener = get_dm_listener(c.channel_id);
  if (!listener) return ok();
  const r = await listener.listener.on_message(c);
  if (r.isErr()) return err(r);
  return ok();
});
