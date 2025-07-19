import { z } from 'zod';
import { existsSync, readFileSync } from 'fs';
import JSON5 from 'json5';
import { Result, err, ok } from 'neverthrow';

const ConfigTokens = z.object({
  discord: z.string().nonempty(),
  topgg: z.string().nonempty(),
});

const StyleValue = z.object({
  colour: z.string().startsWith('#'),
  emoji: z.string().nonempty(),
});

const Style = z.object({
  error: StyleValue,
  success: StyleValue,
  info: StyleValue,
  warning: StyleValue,
});

const Web = z.object({
  enabled: z.boolean(),
  port: z.number().min(0).max(65535).default(2003),
});


const Redis = z.object({
  user: z.string(),
  password: z.string(),
  host: z.string().default("127.0.0.1"),
  port: z.number().default(6379)
})

const Database = z.object({
  flavour: z.enum(['sqlite', 'mysql']).default('sqlite'),
  database_path: z.string().default('./data.db'),
  redis: Redis
});

const Config = z.object({
  tokens: ConfigTokens,
  paywall_enabled: z.boolean(),
  web: Web,
  database: Database,
  clientID: z.string().nonempty('Client ID cannot be empty'),
  owners: z.array(z.string()),
  devServer: z.string().nonempty(),
  logWebhook: z.string().url().startsWith('https://discord.com').optional(),
  style: Style,
});

export type ConfigType = z.infer<typeof Config>;

export function read_config(): Result<ConfigType, unknown> {
  if (!existsSync('./config.json5')) return err(`Config file not found`);
  const safe_read = Result.fromThrowable(readFileSync);
  const config_text = safe_read('./config.json5', 'utf-8');

  if (!config_text.isOk()) return err(config_text.error);
  if (typeof config_text.value != 'string') return err('faulty format on config file');

  const as_json = JSON5.parse(config_text.value);
  const parsed = Config.safeParse(as_json);

  if (parsed.success) {
    return ok(parsed.data);
  } else {
    return err(parsed.error);
  }
}
