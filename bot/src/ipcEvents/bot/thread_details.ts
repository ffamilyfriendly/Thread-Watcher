import { client, load_commands, logger } from 'bot';
import { PrivateEvent } from 'interfaces/PrivateEvents';
import { err, ok, ResultAsync } from 'neverthrow';

interface ThreadDetailsParams {
  thread_id: string;
}

const event: PrivateEvent<ThreadDetailsParams> = {
  event_name: 'FETCH_THREAD',
  async event_callback(request) {
    const result = await ResultAsync.fromPromise(
      client.channels.fetch(request.thread_id),
      (e) => e,
    );

    if (result.isOk()) {
      return ok(result.value);
    } else {
      return err(result.error);
    }
  },
};

export default event;
