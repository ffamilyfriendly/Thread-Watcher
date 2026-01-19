import { database } from '@providers/database';
import { redis } from '@providers/redis';
import { PrivateEvent } from 'interfaces/PrivateEvents';
import { err, ok, ResultAsync } from 'neverthrow';
import { map_err } from 'utilities/error';

const event: PrivateEvent = {
  event_name: 'HEALTH_CHECK',
  async event_callback() {
    const promises = await ResultAsync.fromPromise(
      Promise.all([
        redis.ping(),
        database.count_monitored_channels(),
        database.count_watched_threads(),
      ]),
      map_err,
    );

    if (promises.isErr()) return err(promises.error);

    const [redis_ping, monitored_channels, watched_threads] = promises.value;

    const stats = {
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage().rss / 1024 / 1024,
      monitored_channels: monitored_channels.isOk() ? monitored_channels.value : -1,
      watched_threads: watched_threads.isOk() ? watched_threads.value : -1,
      redis_connected: redis_ping === 'PONG',
    };

    return ok(stats);
  },
};

export default event;
