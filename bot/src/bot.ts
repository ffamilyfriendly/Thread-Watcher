import { Collection } from 'discord.js';
import { BaseCommand } from 'interfaces/BaseCommandInterface';
import { BotIpcClient } from 'utilities/ipc_clients';
import { ResultAsync } from 'neverthrow';
import { map_err } from 'utilities/error';
import { initialize_i18n, setup_shutdown_function } from 'utilities/lifecycle';
import { load_commands, load_events, load_ipc_events } from 'utilities/file_loaders';
import Config from 'providers/config';
import Logger from 'providers/logger';
import Redis from 'providers/redis';
import Database from 'providers/database';
import Client from 'providers/client';
import { commands } from '@providers/commands';
import { ipc_client } from '@providers/ipc/bot_ipc_client';

const logger = Logger.with_name('bot');
const config = Config.instance;
const client = Client.instance;
const database = Database.instance;
const redis = Redis.instance;

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
  console.trace();
  process.exit(1);
}
