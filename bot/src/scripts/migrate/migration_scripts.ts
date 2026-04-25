import { SettingKey } from '../../../../packages/shared/settings';
import { v2_query, v3_db } from './migrate_db';
import { strToRegex } from './pattern_thing';
import { V2Channel, V2Config, V2Thread } from './types';

export async function migrate_guilds() {
  const guild_ids = new Set<string>();

  const threads = await v2_query<V2Thread>('SELECT * FROM threads');
  const channels = await v2_query<V2Channel>('SELECT * FROM channels');
  const configs = await v2_query<V2Config>('SELECT * FROM config');

  threads.forEach((t) => guild_ids.add(t.server));
  channels.forEach((c) => guild_ids.add(c.server));
  configs.forEach((c) => guild_ids.add(c.server));

  for (const guild_id of guild_ids) {
    const res = await v3_db.ensure_guild(guild_id);
    if (res.isErr()) {
      console.error(`Failed to migrate guild ${guild_id}`, res.error);
    }
  }

  console.log(`Migrated ${guild_ids.size} guilds!`);
  return { threads, channels, configs };
}

export async function migrate_threads(threads: V2Thread[]) {
  let skipped_unwatched = 0;
  let skipped_error = 0;
  let success = 0;

  for (const thread of threads) {
    const due_archive = new Date(thread.dueArchive * 1000);

    if (!thread.watching) {
      skipped_unwatched += 1;
      continue;
    }

    const res = await v3_db.insert_thread({
      guild_id: thread.server,
      thread_id: thread.id,
      due_archive: due_archive,
    });

    if (res.isErr()) {
      console.error(`Could not insert thread ${thread.id}`, res.error);
      skipped_error += 1;
    } else {
      success += 1;
    }
  }

  console.log(
    `Migrated ${threads.length} threads.\n- Successfully: ${success}\n- Error: ${skipped_error}\n- not watched: ${skipped_unwatched}`,
  );
}

export async function migrate_monitors(channels: V2Channel[]) {
  let success = 0;
  let errs = 0;
  for (const ch of channels) {
    const regxp = ch.regex ? strToRegex(ch.regex) : null;

    const res = await v3_db.upsert_monitor(
      {
        target_id: ch.id,
        guild_id: ch.server,
        is_suspended: false,
      },
      {
        regex: regxp ? regxp.regex : undefined,
        tags: ch.tags?.split(',') ?? [],
        role_whitelist: ch.roles?.split(',') ?? [],
      },
    );

    if (res.isErr()) {
      console.error(`Failed to migrate monitor ${ch.id}`, res.error);
      errs += 1;
    } else {
      success += 1;
    }
  }

  console.log(`Migrated ${channels.length} channels!\n- Succesfully: ${success}\n- Error: ${errs}`);
}

export async function migrate_settings(settings: V2Config[]) {
  let success = 0;
  let unknown_key = 0;
  let errs = 0;

  const SETTING_MAP: Record<string, SettingKey> = {
    LOGCHANNEL: 'LOGGING_CHANNEL',
    BEHAVIOUR: 'BUMP_BEHAVIOUR',
  };

  const BEHAVIOUR_MAP: Record<string, string> = {
    DEFAULT: 'BUMP_AND_UNARCHIVE',
    UNARCHIVE_ONLY: 'UNARCHIVE_ONLY',
  };

  for (const st of settings) {
    const st_key = SETTING_MAP[st.cfg_id];

    if (!st_key) {
      unknown_key += 1;
      console.log(`Setting '${st.cfg_id}' is unknown`);
      continue;
    }

    const conf_value =
      st_key === 'BUMP_BEHAVIOUR' ? (BEHAVIOUR_MAP[st.value] ?? 'BUMP_AND_UNARCHIVE') : st.value;

    const res = await v3_db.set_guild_setting_value(st.server, st_key, conf_value);

    if (res.isErr()) {
      console.error(`Could not insert '${st_key}' on ${st.server}`, {
        err: res.error,
        setting: st,
      });
      errs += 1;
    } else {
      success += 1;
    }
  }

  console.log(
    `Migrated ${settings.length} settings!\n- Succesfully: ${success}\n- Error: ${errs}\n- Unknown Keys: ${unknown_key}`,
  );
}

export async function migrate_fr() {
  console.time('Migration');
  const { threads, channels, configs } = await migrate_guilds();
  await migrate_threads(threads);
  await migrate_monitors(channels);
  await migrate_settings(configs);
  console.timeEnd('Migration');
}
