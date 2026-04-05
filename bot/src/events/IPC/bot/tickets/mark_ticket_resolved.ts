import { client } from '@providers/client';
import { ticket_service } from '@providers/services/ticket_service';
import { define_secure_event } from 'interfaces/PrivateEvents';
import { do_resolved_actions } from 'modules/ticket/_actions/mark_resolved';
import { err, ok, ResultAsync } from 'neverthrow';
import { map_err } from 'utilities/error';

export default define_secure_event('mark_ticket_resolved', async ({ ticket_id, user_id }) => {
  const ticket_obj = await ticket_service.get_ticket(ticket_id);
  if (ticket_obj.isErr()) return err(ticket_obj.error);
  const thread = await ResultAsync.fromPromise(
    client.channels.fetch(ticket_obj.value.discord_channel_id),
    map_err,
  );
  if (thread.isErr()) return err(thread.error);
  if (!thread.value?.isThread())
    return err(new Error('ticket was not created in a thread channel!')); // This will realistically never happen

  const did_actions = await do_resolved_actions(thread.value, ticket_obj.value, user_id);
  if (did_actions.isErr()) return err(did_actions.error);

  return ok();
});
