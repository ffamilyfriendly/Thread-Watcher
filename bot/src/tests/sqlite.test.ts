import { beforeEach, describe, expect, test } from 'bun:test';
import Sqlite from 'database/sqlite/adapter';
import { Result } from 'neverthrow';

function e(v: Result<unknown, unknown>): string {
  if (v.isOk()) return 'no error';
  const e = v.error;

  if (e instanceof Error) return e.message;
  else return `${e}`;
}

describe('Sqlite Adapter', () => {
  let adapter: Sqlite;

  beforeEach(async () => {
    const mock_config = { database: { database_path: ':memory:' } } as any;
    adapter = new Sqlite(mock_config);
    adapter['raw_db'].run('PRAGMA foreign_keys = ON;');
  });

  test('Should insert & retrieve a monitor with thread count', async () => {
    const channel_id = '676767';

    await adapter.upsert_monitor({
      target_id: channel_id,
      guild_id: 'guild_1',
      is_suspended: false,
    });

    await adapter.insert_thread({
      thread_id: 'thread_1',
      guild_id: 'guild_1',
      managed_by: channel_id,
      due_archive: new Date(),
    });

    const result = await adapter.get_monitor(channel_id);

    expect(result.isOk()).toBe(true);
    if (result.isOk() && result.value) {
      expect(result.value.target_id).toBe(channel_id);
      expect(result.value.manages_threads_count).toBe(1);
    }
  });

  test('database errors should fail gracefully', async () => {
    const err_thrown = await adapter.should_fail_gracefully(false);
    expect(err_thrown.isErr()).toBe(true);

    const err_rejected = await adapter.should_fail_gracefully(true);
    expect(err_rejected.isErr()).toBe(true);
  });

  test('Should delete inactive guild & propagate', async () => {
    const guild_id_1 = 'guild_active';
    const guild_id_2 = 'guild_dead';

    const t1hour = 60 * 60 * 1000;
    const t10min = 10 * 60 * 1000;

    await adapter.upsert_guild_info(guild_id_1, {
      left_at: new Date(Date.now() - t10min),
    });

    await adapter.upsert_guild_info(guild_id_2, {
      left_at: new Date(Date.now() - t1hour),
    });

    const thread_g1_id = 'thread_1';
    const thread_g2_id = 'thread_2';
    await adapter.insert_thread({
      thread_id: thread_g1_id,
      guild_id: guild_id_1,
      due_archive: new Date(),
    });
    await adapter.insert_thread({
      thread_id: thread_g2_id,
      guild_id: guild_id_2,
      due_archive: new Date(),
    });

    await adapter.remove_data_from_inactive_guilds(1800);

    const r_g1 = await adapter.get_guild_info(guild_id_1);
    const r_g2 = await adapter.get_guild_info(guild_id_2);

    expect(r_g1._unsafeUnwrap()).toBeObject();
    expect(r_g2._unsafeUnwrap()).toBeNull();

    const thread_should_be_gone = await adapter.get_thread(thread_g2_id);
    expect(thread_should_be_gone.isOk(), e(thread_should_be_gone)).toBe(true);
    expect(thread_should_be_gone._unsafeUnwrap()).toBeNull();

    const thread_should_be_here = await adapter.get_thread(thread_g1_id);
    expect(thread_should_be_here.isOk(), e(thread_should_be_here)).toBe(true);
    expect(thread_should_be_here._unsafeUnwrap()).toBeObject();
  });

  test('Ticket panel should be insertable & editable', async () => {
    const guild_id = 'guild_1';
    const initial_channel_id = 'channel_1';
    const test_embed = { title: 'Hello', fields: [], colour: '#121212' };
    const panel_create_res = await adapter.insert_ticket_panel(guild_id, {
      name: 'Test',
      description: 'hi',
      guild_id,
      resolve_behaviour: 'DELETE_THREAD',
      should_GPT_summarize_ticket: false,
      should_watch_ticket: false,
      pipeline: [],
      initial_assigned_roles: [],
      commencement_embed: test_embed,
      resolve_embed: test_embed,
      initial_channel_id,
      commencement_method: {
        type: 'BUTTON',
        button_text: 'Hello button!',
      },
    });

    expect(panel_create_res.isOk(), e(panel_create_res)).toBe(true);
    const panel_id = panel_create_res.isOk() ? panel_create_res.value : { panel_id: 'FAILED' };

    const fetched_panel = await adapter.get_ticket_panel(panel_id.panel_id);
    expect(fetched_panel.isOk(), e(fetched_panel)).toBe(true);
    expect(fetched_panel._unsafeUnwrap()).toBeObject();

    const updated_button_text = 'TEST_EDIT';

    await adapter.update_ticket_panel(panel_id.panel_id, {
      commencement_method: { type: 'BUTTON', button_text: updated_button_text },
    });

    const updated_panel = await adapter.get_ticket_panel(panel_id.panel_id);
    expect(updated_panel.isOk(), e(updated_panel)).toBe(true);

    const u_p = updated_panel._unsafeUnwrap();
    expect(u_p).toBeObject();
    expect(u_p?.commencement_method.type).toBe('BUTTON');
    if (u_p?.commencement_method.type === 'BUTTON') {
      expect(u_p.commencement_method.button_text).toBe(updated_button_text);
    }

    await adapter.delete_ticket_panel(panel_id.panel_id);

    const should_be_null = await adapter.get_ticket_panel(panel_id.panel_id);
    expect(should_be_null.isOk()).toBe(true);
    expect(should_be_null._unsafeUnwrap()).toBeNull();
  });
});
