import { readFileSync } from 'fs';
import i18next from 'i18next';
import { Database } from 'interfaces/Database';
import Redis from 'ioredis';
import { ResultAsync } from 'neverthrow';
import AuditService from 'services/AuditService';
import ChannelService from 'services/ChannelService';
import ComponentService from 'services/ComponentService';
import GuildService from 'services/GuildService';
import SettingService from 'services/SettingService';
import ThreadBumper from 'services/ThreadBumper';
import ThreadService from 'services/ThreadService';
import { Logger } from 'tslog';
import { map_err } from './error';

export function create_services_bot(database: Database, redis: Redis) {
  return {
    thread_service: new ThreadService(database, redis),
    setting_service: new SettingService(database, redis),
    component_service: new ComponentService(),
    channel_service: new ChannelService(database, redis),
    thread_bumper: new ThreadBumper(),
    audit_service: new AuditService(database),
    guild_service: new GuildService(database, redis),
  };
}

export function create_services_index(database: Database, redis: Redis) {
  return {
    thread_service: new ThreadService(database, redis),
    setting_service: new SettingService(database, redis),
    channel_service: new ChannelService(database, redis),
    audit_service: new AuditService(database),
  };
}

type LoggerType = Logger<unknown>;
export function initialize_i18n(logger: LoggerType) {
  const resources = {
    'en-GB': { translation: JSON.parse(readFileSync('./locales/en/common.json', 'utf-8')) },
    'sv-SE': { translation: JSON.parse(readFileSync('./locales/sv/common.json', 'utf-8')) },
  };

  i18next.init({
    resources,
    fallbackLng: 'en-GB',
    interpolation: { escapeValue: false },
  });

  i18next.on('missingKey', (lng, ns, key) => {
    logger.warn(`Missing translation for ${key} (${ns}) in ${lng}`);
  });
}

export function setup_shutdown_function(logger: LoggerType, database: Database, redis: Redis) {
  async function shutdown() {
    logger.info('SHUTTING DOWN...');

    const redis_res = await ResultAsync.fromPromise(redis.quit(), map_err);

    if (redis_res.isErr()) {
      logger.error('Failed to close redis connection', redis_res.error);
    } else {
      logger.info('👍 closed redis connection');
    }

    const db_res = await database.close();
    if (db_res.isErr()) {
      logger.error('Failed to close database connection', db_res.error);
    } else {
      logger.info('👍 closed database connection');
    }

    logger.info('👋 bye bye');
    process.exit(0);
  }

  process.on('SIGABRT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
