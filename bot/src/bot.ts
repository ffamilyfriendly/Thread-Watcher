import { ResultAsync } from 'neverthrow';
import { map_err } from '#/utilities/error';
import { initialize_i18n, setup_shutdown_function } from '#/utilities/lifecycle';
import { load_commands, load_events, load_ipc_events } from '#/utilities/file_loaders';
import Config from '@providers/config';
import Logger from '@providers/logger';
import Redis from '@providers/redis';
import Database from '@providers/database';
import Client from '@providers/client';
import { commands } from '@providers/commands';
import { ipc_client } from '@providers/ipc/bot_ipc_client';
import { entitlement_service } from '@providers/services/entitlement_service';
import { LocalClientProvider } from '#/services/EntitlementService';
import { ticket_service } from '@providers/services/ticket_service';
import { fetch_bot_context as fetch_user_bot_context } from '#/fetchers/user_fetcher';
import { event_bus } from '@providers/event_bus';
import { send_audit } from '#/utilities/send_audit_log';
import { audit_service } from '@providers/services/audit_service';

const logger = Logger.with_name('bot');
const config = Config.instance;
const client = Client.instance;
const database = Database.instance;
const redis = Redis.instance;

// set provider strategies
entitlement_service.set_provider(new LocalClientProvider(client));
ticket_service.set_user_fetcher(fetch_user_bot_context);
event_bus.set_on_emit((key, payload) => {
  audit_service.log_event(payload).then((r) => {
    if (r.isErr())
      logger.error(
        `could not save audit log '${payload.data.audit_type}' in ${payload.guild_id}`,
        r.error,
      );
  });
  send_audit(key, payload);
});

async function bootstrap() {
  initialize_i18n(logger);
  const loaders = await Promise.all([
    load_ipc_events(logger, ipc_client),
    load_events(client),
    load_commands(commands),
  ]);

  for (const res of loaders) {
    if (res.isErr()) {
      logger.fatal('Failed to load bot modules', res.error);
      process.exit(1);
    }
  }

  const auth_res = await ResultAsync.fromPromise(client.login(config.tokens.discord), map_err);
  if (auth_res.isErr()) {
    logger.fatal('Could not authenticate!', auth_res.error);
  } else {
    logger.info('🧵 Bot is online!');
  }

  setup_shutdown_function(logger, database, redis);
}

if (client.shard) {
  bootstrap();
} else {
  if (process.env.BYPASS_ORPHAN_CHECK && process.env.BYPASS_ORPHAN_CHECK === 'true') {
    logger.info('BYPASS_ORPHAN_CHECK is set.');
  }
  logger.warn(
    '"client.shard" not set. Will not attempt to login\n',
    'Somewhere there is a circular ref. Find it, fix it, laugh at it.',
  );
  process.exit(1);
}
