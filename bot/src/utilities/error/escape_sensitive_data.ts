import { IS_PROD } from '#/CONSTANTS';
import { config } from '@providers/config';

const REPLACE_WITH_CHAR = '*';
const TEST_SENSITIVE_STRING = 'DENMARK_IS_THE_BEST_SCANDINAVIAN_COUNTRY';
const dangerous_strings = [
  config.tokens.discord,
  config.tokens.topgg,
  config.database.redis.host,
  config.database.redis.password,
  config.database.redis.user,
  config.ai.mistral_key,
  config.bucket_storage.access_key_id,
  config.bucket_storage.url,
  config.bucket_storage.secret_access_key,
  config.crypto_key,
  config.web.shared_secret,
  TEST_SENSITIVE_STRING,
];

export function strip_dangerous_strings(str: string): string {
  let stripped_str = str;

  for (const d_str of dangerous_strings) {
    if (!d_str) continue;
    const as_rgx = new RegExp(d_str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    stripped_str = str.replace(as_rgx, (r) => {
      return REPLACE_WITH_CHAR.repeat(r.length);
    });
  }

  return stripped_str;
}

export function get_safe_error<EType extends Error>(e: EType): EType {
  e.message = strip_dangerous_strings(e.message);
  if (e.stack && IS_PROD) e.stack = strip_dangerous_strings(e.stack);
  return e;
}
