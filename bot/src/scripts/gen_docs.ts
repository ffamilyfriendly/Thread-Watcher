import { Logger } from 'tslog';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import generate_types from './utils/gen_type_file';

const logger = new Logger({ name: 'DOC GEN' });

const languages = readdirSync('./locales');
logger.info(`found ${languages.length} languages${languages.map((l) => `\n- ${l}`).join('')}`);

for (const lang of languages) {
  const translations_file_path = join('./locales', lang, 'common.json');
  const translations_file = JSON.parse(readFileSync(translations_file_path, 'utf-8'));
  logger.info(`Succesfully loaded translations for ${lang}`);

  const markdown_folder_path = join('./locales', lang, 'md');
  if (!existsSync(markdown_folder_path)) {
    logger.warn(`found no md folder for ${lang}`);
    continue;
  }

  const md_files = readdirSync(markdown_folder_path).filter((f) => f.endsWith('.md'));
  logger.info(`found ${md_files.length} markdown files for ${lang}`);

  for (const md_file of md_files) {
    const path_parts = md_file.split('.').slice(0, -1);

    const md_txt = readFileSync(join(markdown_folder_path, md_file), 'utf-8')
      .split('\n')
      .join('\n')
      .trim();

    set_nested_prop(translations_file, path_parts, md_txt);
  }

  writeFileSync(translations_file_path, JSON.stringify(translations_file, null, 2));
}

const english_file_path = join('./locales', 'en', 'common.json');
const english_file = JSON.parse(readFileSync(english_file_path, 'utf-8'));
generate_types(english_file);

function set_nested_prop(obj: any, path: string[], value: string) {
  let current = obj;

  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (!current[key]) {
      current[key] = {};
    }
    current = current[key];
  }

  current[path[path.length - 1]] = value;
}
