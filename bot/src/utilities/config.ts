import { z } from 'zod';
import { existsSync, readFileSync } from 'fs';
import JSON5 from 'json5';
import { Result, err, ok } from 'neverthrow';
import { ColorResolvable } from 'discord.js';

const ConfigTokens = z.object({
  discord: z.string().nonempty(),
  topgg: z.string().nonempty(),
});

const StyleValue = z.object({
  colour: z
    .string()
    .startsWith('#')
    .transform((v) => v as ColorResolvable),
  emoji: z.string().nonempty(),
});

const Style = z.object({
  error: StyleValue,
  success: StyleValue,
  info: StyleValue,
  warning: StyleValue,
  premium: StyleValue,
});

const Web = z.object({
  enabled: z.boolean(),
  port: z.number().min(0).max(65535).default(2003),
  hostname: z.string().url(),
  shared_secret: z.string(),
  topgg_webhook_secret: z.string(),
  ms_request_considered_slow: z.number().default(200),
});

const Redis = z.object({
  user: z.string(),
  password: z.string(),
  host: z.string().default('127.0.0.1'),
  port: z.number().default(6379),
});

const ZCronTab = z
  .string()
  .regex(
    /^((((\d+,)+\d+|(\d+(\/|-|#)\d+)|\d+L?|\*(\/\d+)?|L(-\d+)?|\?|[A-Z]{3}(-[A-Z]{3})?) ?){5,7})|(@(annually|yearly|monthly|weekly|daily|hourly|reboot))|(@every (\d+(ns|us|µs|ms|s|m|h))+)$/gm,
  );

const BaseDb = z.object({
  backup_path: z.string().default('./backups'),
  backup_interval: ZCronTab,
  upload_backup_to_bucket: z.boolean(),
  keep_local_files_amount: z.number(),
  run_cleanup_tasks: ZCronTab,
  keep_dead_servers_in_db_seconds: z.number(),
  redis: Redis,
});

const SqliteConnection = BaseDb.extend({
  flavour: z.literal('sqlite').default('sqlite'),
  database_path: z.string().default('./data.db'),
});

const MySqlConnection = BaseDb.extend({
  flavour: z.literal('mysql').default('mysql'),
  host: z.string(),
  user: z.string(),
  password: z.string(),
  name: z.string(),
  connection_limit: z.number().default(5),
});
export type MySqlConf = z.output<typeof MySqlConnection>;

const Database = z.discriminatedUnion('flavour', [SqliteConnection, MySqlConnection]);

const BucketStorage = z.object({
  url: z.url(),
  secret_access_key: z.string(),
  access_key_id: z.string(),
  free_file_limit: z.number(),
  global_file_limit: z.number(),
});

const ZPaywall = z.object({
  enabled: z.boolean(),
  basic_sku: z.string(),
  retain_tickets_days_free: z.number(),
  retain_tickets_days_premium: z.number(),
  reconsile_payments_schedule: ZCronTab.default('0 */6 * * *'),
});

const ZAi = z.object({
  monthly_tokens_premium: z.number(),
  initial_free_tokens: z.number(),
  vote_reward_tokens: z.number(),
  mistral_key: z.string(),
  agents: z.object({
    regex_agent: z.string(),
    issue_narrower: z.string(),
    ticket_summarizer: z.string(),
  }),
});

export const ZConfig = z.object({
  tokens: ConfigTokens,
  paywall: ZPaywall,
  web: Web,
  database: Database,
  bucket_storage: BucketStorage,
  clientID: z.string().nonempty('Client ID cannot be empty'),
  ai: ZAi,
  owners: z.array(z.string()),
  devServer: z.string().nonempty(),
  support_server_link: z.url().default('https://botsuite.co/join'),
  logWebhook: z.string().url().startsWith('https://discord.com').optional(),
  style: Style,
  crypto_key: z.string(),
  limited_mode: z.boolean(),
  modules: z.object({
    thread_create_bots: z.array(z.string()).default(['878399831238909952']),
  }),
});

export type ConfigType = z.infer<typeof ZConfig>;

export function read_config(): Result<ConfigType, unknown> {
  if (!existsSync('./config.json5')) return err(`Config file not found`);
  const safe_read = Result.fromThrowable(readFileSync);
  const config_text = safe_read('./config.json5', 'utf-8');

  if (!config_text.isOk()) return err(config_text.error);
  if (typeof config_text.value != 'string') return err('faulty format on config file');

  const as_json = JSON5.parse(config_text.value);
  const parsed = ZConfig.safeParse(as_json);

  if (parsed.success) {
    return ok(parsed.data);
  } else {
    return err(parsed.error);
  }
}
