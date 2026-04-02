import { config } from '@providers/config';
import { database } from '@providers/database';
import { logger } from '@providers/logger';
import { schedule } from 'node-cron';
import { Logger } from 'tslog';

let l: Logger<unknown>;

async function clean_logs() {
  const res = await database.clean_expired_logs();
  if (res.isErr()) {
    l.error('Could not clean expired audit logs!', res.error);
  } else {
    l.silly('Cleaned expired audit logs!');
  }
}

async function clean_abandoned_servers() {
  const res = await database.remove_data_from_inactive_guilds();
  if (res.isErr()) {
    l.error('Could not remove data from abandoned servers!', res.error);
  }
  {
    l.silly('Removed data from abandoned servers!');
  }
}

async function clean_expired_tickets() {
  const res = await database.delete_old_tickets();
  if (res.isErr()) {
    l.error(`Could not delete expired tickets!`, res.error);
    return;
  }

  l.info(
    `Removed ${res.value.length} tickets!`,
    res.value.map((t) => `- ${t.name} (${t.ticket_id}) in ${t.guild_id}`).join('\n'),
  );
}

function run_cleaners() {
  clean_logs();
  clean_abandoned_servers();
  clean_expired_tickets();
}

export function start_cleanup_interval() {
  // Named after the great cleaner
  l = logger.getSubLogger({ name: 'M-O 🧹' });
  schedule(config.database.run_cleanup_tasks, run_cleaners);
}
