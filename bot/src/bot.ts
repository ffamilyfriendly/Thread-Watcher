import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { read_config } from './utilities/config';
import { Logger } from 'tslog';
import { BaseCommand } from 'interfaces/Command';
import { BotIpcClient } from 'utilities/ipc_clients';
import get_database_instance from 'database';
import Redis from 'ioredis';
import { ResultAsync } from 'neverthrow';
import { map_err } from 'utilities/error';
import { create_services_bot, initialize_i18n, setup_shutdown_function } from 'utilities/lifecycle';
import { load_commands, load_events, load_ipc_events } from 'utilities/file_loaders';

const config_result = read_config();
const logger = new Logger({ name: 'bot' });
const commands = new Collection<string, BaseCommand>();

if (config_result.isErr()) {
  logger.fatal('Error when reading configuration file', config_result.error);
  process.exit(1);
}

const config = config_result.value;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

const ipc_client = new BotIpcClient(client);
const database = get_database_instance(config);
const redis = new Redis();

export const {
  guild_service,
  thread_service,
  audit_service,
  setting_service,
  channel_service,
  component_service,
  thread_bumper,
} = create_services_bot(database, redis);

export { logger, commands, config, load_commands, client, ipc_client, database, redis };

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
  logger.warn(
    '"client.shard" not set. Will not attempt to login\n',
    'if you see this while running the deploy command everything is in order and you can disregard',
  );
  console.trace();
  process.exit(1);
}
