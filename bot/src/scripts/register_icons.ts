/**
 * I won't even lie, this is massivly overengineered :)
 * Idea is that its a pain to register app emojis manually and make sure the bot actually uses them.
 * especially when you have a dev bot and a prod bot. It's easy to forget changing an ID from one over to the other.
 * This code will automatically register any emojis from the /icons directory and create a lil' lookup table we can use in the bot code.
 *
 * I fill bags with rocks at work which aint very mentally taxing so thought about a system like this thruout the day. Now here it is 🤓☝️
 */

import { Logger } from 'tslog';
import { read_config } from '#/utilities/config';
import { REST, Routes } from 'discord.js';
import { err, fromThrowable, ok, Result, ResultAsync } from 'neverthrow';
import { map_err, mapped_err } from '#/utilities/error';
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { mkdir } from 'node:fs/promises';
import z from 'zod';
import { join, parse as parse_filename } from 'path';

const logger = new Logger();

const config_result = read_config();
if (config_result.isErr()) {
  logger.fatal(config_result.error);
  process.exit(1);
}

const DISCORD_TOKEN = config_result.value.tokens.discord;
const DISCORD_APP_ID = config_result.value.clientID;
const EMOJIS_FILE_PATH = join(process.cwd(), '../icons');

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

const ZEmoji = z.object({
  id: z.string(),
  name: z.string(),
  animated: z.coerce.boolean(),
});

const ZEmojiListing = z.object({
  items: z.array(ZEmoji),
});

type EmojiListings = z.output<typeof ZEmoji>[];

async function get_registered_emojis() {
  return ResultAsync.fromPromise(
    rest.get(Routes.applicationEmojis(DISCORD_APP_ID)),
    map_err,
  ).andThen((emoji_data) => {
    const parsed = ZEmojiListing.safeParse(emoji_data);
    return parsed.success ? ok(parsed.data) : err(parsed.error);
  });
}

type LocalEmoji = { filename: string; sanitized_name: string; full_path: string };

function get_sanitized_name(name: string): string {
  let new_name = parse_filename(name).name;
  new_name = new_name.replaceAll(' ', '_');
  new_name = new_name.replace(/[^a-zA-Z_0-9]+/gm, '');
  return new_name;
}

function get_local_emojis(): Result<LocalEmoji[], Error> {
  const safe_read = fromThrowable(() => readdirSync(EMOJIS_FILE_PATH));
  const files = safe_read();
  if (files.isErr()) return mapped_err(files.error);
  const locals_as_emoji = files.value.map((f) => {
    return {
      filename: f,
      full_path: join(EMOJIS_FILE_PATH, f),
      sanitized_name: get_sanitized_name(f),
    };
  });
  return ok(locals_as_emoji);
}

function register_emoji(emoji: LocalEmoji) {
  if (!(emoji.filename.endsWith('.png') || emoji.filename.endsWith('.gif')))
    return err(new Error('emoji file must be .png or .gif'));
  const emoji_data = Result.fromThrowable(() => {
    return readFileSync(emoji.full_path, { encoding: 'base64' });
  })();
  if (emoji_data.isErr()) return err(emoji_data.error);

  const filetype = emoji.filename.endsWith('.png') ? 'image/png' : 'image/gif';
  const payload = 'data:' + filetype + ';base64,' + emoji_data.value;

  return ResultAsync.fromPromise(
    rest.post(Routes.applicationEmojis(DISCORD_APP_ID), {
      body: {
        name: emoji.sanitized_name,
        image: payload,
      },
    }),
    map_err,
  ).andThen((emoji_res) => {
    const parsed_emoji = ZEmoji.safeParse(emoji_res);
    return parsed_emoji.success ? ok(parsed_emoji.data) : err(parsed_emoji.error);
  });
}

async function generate_typings_file(emojis: EmojiListings) {
  const dir_path = join(process.cwd(), './src/.generated/');

  const cr_dir = await ResultAsync.fromPromise(mkdir(dir_path, { recursive: true }), map_err);
  if (cr_dir.isErr()) return err(cr_dir.error);

  const as_entries = emojis.map((e) => [e.name.toLowerCase(), { id: e.id, animated: e.animated }]);
  const table = Object.fromEntries(as_entries);

  return Result.fromThrowable(() =>
    // JSON.stringify() is safe here since we know the object is serializable
    writeFileSync(join(dir_path, 'emojis.json'), JSON.stringify(table)),
  )();
}

async function register_emojis() {
  const registered_commands_result = await get_registered_emojis();
  if (registered_commands_result.isErr())
    return logger.error('-> failed!', registered_commands_result.error);

  const listings: EmojiListings = registered_commands_result.value.items;

  const name_set = new Set(registered_commands_result.value.items.map((v) => v.name));

  logger.info('getting local emojis...');
  const local_emojis_result = get_local_emojis();
  if (local_emojis_result.isErr()) return logger.error('-> failed!', local_emojis_result.error);

  for (const local_emoji of local_emojis_result.value) {
    if (name_set.has(local_emoji.sanitized_name)) {
      logger.info(`skipping '${local_emoji.filename}' (already registered)`);
      continue;
    }

    logger.info(`Registering '${local_emoji.filename}' as '${local_emoji.sanitized_name}'...`);
    const register_result = await register_emoji(local_emoji);

    if (register_result.isErr()) logger.error('-> failed!', register_result.error);
    else {
      logger.info(`-> registered '${register_result.value.name}' (${register_result.value.id})`);
      listings.push(register_result.value);
    }
  }

  logger.info('generating typings...');
  const typings_result = await generate_typings_file(listings);
  if (typings_result.isErr()) return logger.error('-> failed!', typings_result.error);
  logger.info('All done! register_icons signing off ✌️');
}

register_emojis();
