import { config, database, logger } from 'index';
import { schedule } from 'node-cron';
import { Logger } from 'tslog';

let l: Logger<unknown>;

async function clean_logs() {
  const res = await database.clean_expired_logs();
  if (res.isErr()) {
    l.error('Could not clean expired audit logs!', res.error);
  } else {
    l.debug('Cleaned expired audit logs!');
  }
}

function run_cleaners() {
  clean_logs();
}

export function start_cleanup_interval() {
  // Named after the great cleaner
  l = logger.getSubLogger({ name: 'M-O 🧹' });
  schedule(config.database.run_cleanup_tasks, run_cleaners);
}
