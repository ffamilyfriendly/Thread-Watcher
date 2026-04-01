import { err, ok, Result, ResultAsync } from 'neverthrow';
import sql, { Database as SqliteDb } from 'bun:sqlite';
import { ConfigType } from 'utilities/config';
import { with_error_handling, with_schema } from 'database';
import { join, resolve as resolve_path } from 'path';
import { create as create_tar } from 'tar';
import { map_err } from 'utilities/error';
import { z } from 'zod';
import { Database, DBResult, TicketInsertion } from 'interfaces/Database';
import { drizzle, BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import {
  AuditData,
  BaseMonitor,
  EditMonitor,
  FilterData,
  Guild,
  ZAuditData,
  ZMonitor,
  ZGuild,
  ThreadSearchData,
  TicketPanel,
  ZTicketPanel,
  EditTicketPanel,
  ZTicketPanelMeta,
  ZTicket,
  EditTicket,
  InsertTicketNote,
  ZTicketNote,
  TicketMessage,
  TicketMessageAttachment,
  IntermediaryTicketView,
  ZIntermediaryTicketView,
  MessagesSeachFilter,
  PublicTicketMessage,
  IntermediaryMessage,
  ZIntermediaryMessage,
  TicketSummarySegment,
  ZTicketSummarySegment,
  ZMessageAttachment,
  TicketListData,
  TicketListSearch,
  ZTicketListData,
} from '@watcher/shared';

import * as schema from './schema';
import * as relations from './relations';
import {
  and,
  count,
  eq,
  inArray,
  lte,
  SQLWrapper,
  sql as sqlstmt,
  getTableColumns,
  isNotNull,
  lt,
  desc,
  gt,
  asc,
} from 'drizzle-orm';
import { DatabaseError, TicketNotFound } from 'utilities/error/def';

const full_schema = { ...schema, ...relations };
type FullSchema = typeof full_schema;

export default class Sqlite implements Database {
  private raw_db: SqliteDb;
  private drizzle: BunSQLiteDatabase<FullSchema>;
  private _config: ConfigType;

  constructor(config: ConfigType) {
    this.raw_db = new sql(config.database.database_path);
    this.drizzle = drizzle(this.raw_db, { schema: full_schema });
    migrate(this.drizzle, { migrationsFolder: './drizzle' });
    this._config = config;
  }

  @with_error_handling
  async get_tickets(filters: TicketListSearch) {
    const applied_filters = [eq(schema.Ticket.guild_id, filters.guild_id)];
    const limit = Math.min(filters.limit, 500);
    const offset = filters.offset ?? 0;

    if (filters.assigned_to_user_id) {
      applied_filters.push(eq(schema.Ticket.claimed_by_user_id, filters.assigned_to_user_id));
    }

    if (filters.panel_id) {
      applied_filters.push(eq(schema.Ticket.panel_id, filters.panel_id));
    }

    if (filters.status) {
      applied_filters.push(eq(schema.Ticket.status, filters.status));
    }

    if (filters.ticket_owner) {
      applied_filters.push(eq(schema.Ticket.owner, filters.ticket_owner));
    }
    const results = await this.drizzle.query.Ticket.findMany({
      with: {
        messages: {
          limit: 1,
          orderBy: desc(schema.Message.created_at),
        },
      },
      where: and(...applied_filters),
      limit,
      offset,
    });

    const tickets = results.map((t) => ({
      ...t,
      last_activity: t.messages[0]?.created_at ?? t.created_at,
    }));

    return with_schema(tickets, z.array(ZTicketListData));
  }

  @with_error_handling
  async delete_ticket(ticket_id: string) {
    await this.drizzle.delete(schema.Ticket).where(eq(schema.Ticket.ticket_id, ticket_id));
    return ok();
  }

  @with_error_handling
  async get_attachments(ticket_id: string) {
    const attachments = await this.drizzle.query.MessageAttachment.findMany({
      with: {
        message: true,
      },
      where: eq(schema.Message.ticket_id, ticket_id),
    });

    return with_schema(attachments, z.array(ZMessageAttachment));
  }

  @with_error_handling
  async insert_summary(data: Omit<TicketSummarySegment, 'summary_id' | 'created_at'>) {
    await this.drizzle.insert(schema.TicketSummary).values(data);
    return ok();
  }

  @with_error_handling
  async get_summaries(ticket_id: string) {
    const segments = await this.drizzle.query.TicketSummary.findMany({
      where: eq(schema.TicketSummary.ticket_id, ticket_id),
    });
    return with_schema(segments, z.array(ZTicketSummarySegment));
  }

  @with_error_handling
  async delete_message(data: TicketMessage) {
    await this.drizzle.delete(schema.Message).where(eq(schema.Message.message_id, data.message_id));
    return ok();
  }

  @with_error_handling
  async get_messages(ticket_id: string, filters: MessagesSeachFilter) {
    const applied_filters = [eq(schema.Message.ticket_id, ticket_id)];
    const limit = Math.min(filters.limit, 500);

    if (filters?.before_id != null) {
      applied_filters.push(lt(schema.Message.message_id, filters.before_id));
    }

    const messages = await this.drizzle.query.Message.findMany({
      where: and(...applied_filters),
      with: {
        attachments: true,
      },
      limit,
      orderBy: desc(schema.Message.created_at),
    });
    messages.reverse();
    return with_schema(messages, z.array(ZIntermediaryMessage));
  }

  @with_error_handling
  async get_summary_candidate_messages(ticket_id: string) {
    const last_summary = await this.drizzle.query.TicketSummary.findFirst({
      where: eq(schema.TicketSummary.ticket_id, ticket_id),
      orderBy: desc(schema.TicketSummary.created_at),
    });

    const messages = await this.drizzle.query.Message.findMany({
      where: and(
        eq(schema.Message.ticket_id, ticket_id),
        last_summary?.end_message_id != null
          ? gt(schema.Message.message_id, last_summary.end_message_id)
          : undefined,
      ),
    });

    return with_schema(messages, z.array(ZIntermediaryMessage));
  }

  @with_error_handling
  async get_extended_ticket(
    ticket_id: string,
    user_is_elevated: boolean,
  ): DBResult<IntermediaryTicketView> {
    const ticket = await this.drizzle.query.Ticket.findFirst({
      where: eq(schema.Ticket.ticket_id, ticket_id),
      with: {
        messages: {
          with: {
            attachments: true,
          },
          limit: 26,
          orderBy: desc(schema.Message.created_at),
        },
        summaries: {
          orderBy: desc(schema.TicketSummary.created_at),
        },
        ...(user_is_elevated ? { notes: true } : {}),
      },
    });
    if (!ticket) return err(new TicketNotFound(ticket_id));
    ticket.messages.reverse();
    return with_schema(ticket, ZIntermediaryTicketView);
  }

  @with_error_handling
  async update_attachment(attachment_id: string, data: Partial<TicketMessageAttachment>) {
    await this.drizzle
      .update(schema.MessageAttachment)
      .set(data)
      .where(eq(schema.MessageAttachment.attachment_id, attachment_id));
    return ok();
  }

  @with_error_handling
  async delete_attachment(attachment_id: string) {
    await this.drizzle
      .delete(schema.MessageAttachment)
      .where(eq(schema.MessageAttachment.attachment_id, attachment_id));
    return ok();
  }

  @with_error_handling
  async insert_attachments(data: TicketMessageAttachment[]) {
    await this.drizzle.insert(schema.MessageAttachment).values(data);
    return ok();
  }

  @with_error_handling
  async insert_message(data: TicketMessage) {
    await this.drizzle.insert(schema.Message).values(data);
    return ok();
  }

  @with_error_handling
  async insert_attachment(data: TicketMessageAttachment) {
    await this.drizzle.insert(schema.MessageAttachment).values(data);
    return ok();
  }

  @with_error_handling
  async insert_ticket_note(data: InsertTicketNote) {
    const rows = await this.drizzle
      .insert(schema.TicketNote)
      .values(data)
      .returning({ note_id: schema.TicketNote.note_id });
    return ok(rows[0].note_id);
  }

  @with_error_handling
  async get_ticket_notes(ticket_id: string, limit: number, offset: number) {
    const rows = await this.drizzle.query.TicketNote.findMany({
      where: eq(schema.TicketNote.ticket_id, ticket_id),
      limit,
      offset,
      orderBy: schema.TicketNote.created_at,
    });

    return with_schema(rows, z.array(ZTicketNote));
  }

  @with_error_handling
  async delete_ticket_note(note_id: string) {
    await this.drizzle.delete(schema.TicketNote).where(eq(schema.TicketNote.note_id, note_id));
    return ok();
  }

  @with_error_handling
  async close() {
    this.raw_db.close();
    return ok();
  }

  @with_error_handling
  async should_fail_gracefully(fail_with_promise: boolean) {
    if (!fail_with_promise) throw new Error('Something went wrong! (Thrown)');

    // unawaited promises WILL FAIL regardless of the decorator
    await new Promise((_resolve, reject) => {
      reject('Something went wrong! (Promise)');
    });

    return ok();
  }

  @with_error_handling
  async ensure_guild(guild_id: string) {
    await this.drizzle.insert(schema.Guilds).values({ guild_id }).onConflictDoNothing();
    return ok();
  }

  @with_error_handling
  async insert_ticket_panel(guild_id: string, panel: Omit<TicketPanel, 'panel_id'>) {
    await this.ensure_guild(guild_id);
    const val = await this.drizzle
      .insert(schema.TicketPanels)
      .values({
        ...panel,
        panel_id: undefined, // Force undefined to get generation
      })
      .returning({ id: schema.TicketPanels.panel_id });

    return ok({ panel_id: val[0]?.id });
  }

  @with_error_handling
  async get_ticket_panels(guild_id: string) {
    const res = await this.drizzle.query.TicketPanels.findMany({
      where: eq(schema.TicketPanels.guild_id, guild_id),
    });

    return with_schema(res, z.array(ZTicketPanelMeta));
  }

  @with_error_handling
  async get_ticket_panel(panel_id: string) {
    const val = await this.drizzle.query.TicketPanels.findFirst({
      where: eq(schema.TicketPanels.panel_id, panel_id),
    });

    if (!val) return ok(null);

    return with_schema(val, ZTicketPanel);
  }

  @with_error_handling
  async update_ticket_panel(panel_id: string, data: Omit<EditTicketPanel, 'id'>) {
    await this.drizzle
      .update(schema.TicketPanels)
      .set(data)
      .where(eq(schema.TicketPanels.panel_id, panel_id));
    return ok();
  }

  @with_error_handling
  async delete_ticket_panel(panel_id: string) {
    await this.drizzle
      .delete(schema.TicketPanels)
      .where(eq(schema.TicketPanels.panel_id, panel_id));
    return ok();
  }

  @with_error_handling
  async insert_thread(thread: {
    thread_id: string;
    guild_id: string;
    parent_channel_id?: string | null;
    due_archive: Date;
    managed_by?: string | null;
  }) {
    await this.ensure_guild(thread.guild_id);
    await this.drizzle.insert(schema.Threads).values({ ...thread, is_watched: true });
    return ok();
  }

  @with_error_handling
  async delete_thread(thread_id: string) {
    await this.drizzle.delete(schema.Threads).where(eq(schema.Threads.thread_id, thread_id));
    return ok();
  }

  @with_error_handling
  async set_thread_auto_archive(thread_id: string, auto_archive_duration: Date) {
    await this.drizzle
      .update(schema.Threads)
      .set({ due_archive: auto_archive_duration })
      .where(eq(schema.Threads.thread_id, thread_id));
    return ok();
  }

  @with_error_handling
  async set_thread_watched(thread_id: string, is_watched: boolean) {
    await this.drizzle
      .update(schema.Threads)
      .set({ is_watched })
      .where(eq(schema.Threads.thread_id, thread_id));
    return ok();
  }

  @with_error_handling
  async set_thread_manager(thread_id: string, mgr?: string) {
    await this.drizzle
      .update(schema.Threads)
      .set({ managed_by: mgr })
      .where(eq(schema.Threads.thread_id, thread_id));
    return ok();
  }

  @with_error_handling
  async get_thread(thread_id: string) {
    const val = await this.drizzle.query.Threads.findFirst({
      where: eq(schema.Threads.thread_id, thread_id),
    });
    return ok(val ?? null);
  }

  @with_error_handling
  async get_threads_in_guild(guild_id: string, watched: boolean) {
    const val = await this.drizzle.query.Threads.findMany({
      where: and(eq(schema.Threads.guild_id, guild_id), eq(schema.Threads.is_watched, watched)),
    });
    return ok(val);
  }

  @with_error_handling
  async get_paginated_threads_in_guild(guild_id: string, limit: number, filters: ThreadSearchData) {
    const conditions: SQLWrapper[] = [
      eq(schema.Threads.guild_id, guild_id),
      eq(schema.Threads.is_watched, true),
    ];

    if (filters.monitor_id) {
      conditions.push(eq(schema.Threads.managed_by, filters.monitor_id));
    }

    if (filters.parent_channel_id) {
      conditions.push(eq(schema.Threads.parent_channel_id, filters.parent_channel_id));
    }

    const offset = limit * filters.page;

    const val = await this.drizzle.query.Threads.findMany({
      where: and(...conditions),
      limit,
      offset,
    });

    return ok(val);
  }

  @with_error_handling
  async get_watched_threads_count(guild_id: string) {
    const val = await this.drizzle
      .select({ count: count() })
      .from(schema.Threads)
      .where(and(eq(schema.Threads.guild_id, guild_id), eq(schema.Threads.is_watched, true)));

    return ok(val[0]?.count);
  }

  static STALE_BUFFER_MINUTES = 5;
  static STALE_BUFFER_MS = this.STALE_BUFFER_MINUTES * 60 * 1000;
  @with_error_handling
  async get_stale_threads(buffer_in_ms = Sqlite.STALE_BUFFER_MS) {
    const now = Date.now();
    const stale_thresh = new Date(now + buffer_in_ms);

    const val = await this.drizzle.query.Threads.findMany({
      where: and(
        lte(schema.Threads.due_archive, stale_thresh),
        eq(schema.Threads.is_watched, true),
      ),
    });

    return ok(val);
  }

  @with_error_handling
  async get_stale_threads_for_guilds(guild_ids: string[], buffer_in_ms = Sqlite.STALE_BUFFER_MS) {
    const now = Date.now();
    const stale_thresh = new Date(now + buffer_in_ms);

    const val = await this.drizzle.query.Threads.findMany({
      where: and(
        lte(schema.Threads.due_archive, stale_thresh),
        eq(schema.Threads.is_watched, true),
        inArray(schema.Threads.guild_id, guild_ids),
      ),
    });

    return ok(val);
  }

  @with_error_handling
  async set_guild_setting_value(
    guild_id: string,
    setting_id: string,
    setting_value: string,
  ): Promise<Result<string, DatabaseError>> {
    await this.ensure_guild(guild_id);
    const res = await this.drizzle
      .insert(schema.Settings)
      .values({
        guild_id,
        setting_id,
        setting_value,
      })
      .onConflictDoUpdate({
        target: [schema.Settings.guild_id, schema.Settings.setting_id],
        set: { setting_value },
      })
      .returning({ old_value: schema.Settings.setting_value });

    return ok(res[0].old_value);
  }

  @with_error_handling
  async get_guild_setting_value(guild_id: string, setting_id: string) {
    const val = await this.drizzle.query.Settings.findFirst({
      where: and(
        eq(schema.Settings.guild_id, guild_id),
        eq(schema.Settings.setting_id, setting_id),
      ),
    });

    return ok(val?.setting_value ?? null);
  }

  @with_error_handling
  async get_guild_settings(guild_id: string) {
    const val = await this.drizzle.query.Settings.findMany({
      where: eq(schema.Settings.guild_id, guild_id),
    });

    return ok(val);
  }

  @with_error_handling
  async delete_guild_setting_value(guild_id: string, setting_id: string) {
    await this.drizzle
      .delete(schema.Settings)
      .where(
        and(eq(schema.Settings.guild_id, guild_id), eq(schema.Settings.setting_id, setting_id)),
      );
    return ok();
  }

  @with_error_handling
  async upsert_monitor(channel: Omit<BaseMonitor, 'manages_threads_count'>, filters?: FilterData) {
    await this.ensure_guild(channel.guild_id);
    await this.drizzle
      .insert(schema.Monitors)
      .values({
        ...channel,
        ...filters,
        role_whitelist: filters?.role_whitelist,
        tags: filters?.tags,
        regex: filters?.regex?.source,
      })
      .onConflictDoUpdate({
        target: [schema.Monitors.target_id],
        set: {
          ...channel,
          ...filters,
          role_whitelist: filters?.role_whitelist,
          tags: filters?.tags,
          regex: filters?.regex?.source,
        },
      });
    return ok();
  }

  @with_error_handling
  async get_monitor(channel_id: string) {
    const thread_count = this.drizzle
      .select({ count: count() })
      .from(schema.Threads)
      .where(eq(schema.Threads.managed_by, schema.Monitors.target_id));

    const val = await this.drizzle
      .select({
        ...getTableColumns(schema.Monitors),
        manages_threads_count: sqlstmt<number>`(${thread_count})`.mapWith(Number),
      })
      .from(schema.Monitors)
      .where(
        and(eq(schema.Monitors.target_id, channel_id), eq(schema.Monitors.is_suspended, false)),
      );

    if (!val[0]) return ok(null);

    return with_schema(val[0], ZMonitor);
  }

  @with_error_handling
  async get_monitors_in_guild(guild_id: string) {
    const thread_count = this.drizzle
      .select({ count: count() })
      .from(schema.Threads)
      .where(eq(schema.Threads.managed_by, schema.Monitors.target_id));

    const val = await this.drizzle
      .select({
        ...getTableColumns(schema.Monitors),
        manages_threads_count: sqlstmt<number>`(${thread_count})`.mapWith(Number),
      })
      .from(schema.Monitors)
      .where(and(eq(schema.Monitors.guild_id, guild_id), eq(schema.Monitors.is_suspended, false)));

    return with_schema(val, z.array(ZMonitor));
  }

  @with_error_handling
  async delete_monitor(channel_id: string) {
    await this.drizzle.delete(schema.Monitors).where(eq(schema.Monitors.target_id, channel_id));
    return ok();
  }

  @with_error_handling
  async get_monitors_count(guild_id: string) {
    const val = await this.drizzle
      .select({ count: count() })
      .from(schema.Monitors)
      .where(and(eq(schema.Monitors.guild_id, guild_id)));
    return ok(val[0]?.count);
  }

  /*
  id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL, executor_id TEXT NOT NULL, data TEXT NOT NULL, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  */
  @with_error_handling
  async insert_audit_log(log: Omit<AuditData, 'id' | 'timestamp'>) {
    await this.ensure_guild(log.guild_id);
    await this.drizzle.insert(schema.Audit).values(log);
    return ok();
  }

  @with_error_handling
  async get_audit_logs(guild_id: string, limit: number, before_id?: number) {
    const conditions = [eq(schema.Audit.guild_id, guild_id)];

    if (before_id) {
      conditions.push(lte(schema.Audit.id, before_id));
    }

    const val = await this.drizzle.query.Audit.findMany({
      where: and(...conditions),
      orderBy: desc(schema.Audit.id),
      limit,
    });

    return with_schema(val, z.array(ZAuditData)).map((logs) => ({
      logs,
      next_cursor: val.length ? val[val.length - 1].id : null,
    }));
  }

  @with_error_handling
  async get_audit_log(id: number) {
    const val = await this.drizzle.query.Audit.findFirst({
      where: eq(schema.Audit.id, id),
    });

    return with_schema(val, ZAuditData).andThen((row) => {
      if (!row) return err(new Error('not found'));
      return ok(row);
    });
  }

  @with_error_handling
  async clean_expired_logs() {
    await this.drizzle.delete(schema.Audit).where(
      sqlstmt`unixepoch(${schema.Audit.timestamp}) < unixepoch('now') - COALESCE(
        (SELECT ${schema.Settings.setting_value} FROM ${schema.Settings}
         WHERE ${schema.Settings.guild_id} = ${schema.Audit.guild_id}
         AND ${schema.Settings.setting_id} = 'AUDIT_LOG_RETENTION'),
        86400
      )`,
    );

    return ok();
  }

  @with_error_handling
  async get_guild_info(guild_id: string) {
    const val = await this.drizzle.query.Guilds.findFirst({
      where: eq(schema.Guilds.guild_id, guild_id),
    });

    if (!val) return ok(null);

    return with_schema(val, ZGuild);
  }

  @with_error_handling
  async upsert_guild_info(guild_id: string, data: Partial<Omit<Guild, 'guild_id'>>) {
    await this.drizzle
      .insert(schema.Guilds)
      .values({ guild_id, ...data })
      .onConflictDoUpdate({
        set: data,
        target: schema.Guilds.guild_id,
      });
    return ok();
  }

  @with_error_handling
  async edit_monitor(channel_id: string, data: EditMonitor) {
    await this.drizzle
      .update(schema.Monitors)
      .set({
        ...data,
        regex: data.regex?.source,
      })
      .where(eq(schema.Monitors.target_id, channel_id));
    return ok();
  }

  @with_error_handling
  async remove_data_from_inactive_guilds(
    inactive_time_in_seconds = this._config.database.keep_dead_servers_in_db_seconds,
  ) {
    const cutoff_date = new Date(Date.now() - inactive_time_in_seconds * 1000);
    await this.drizzle
      .delete(schema.Guilds)
      .where(and(isNotNull(schema.Guilds.left_at), lt(schema.Guilds.left_at, cutoff_date)));
    return ok();
  }

  @with_error_handling
  async count_watched_threads() {
    const val = await this.drizzle
      .select({ count: count() })
      .from(schema.Threads)
      .where(eq(schema.Threads.is_watched, true));
    return ok(val[0]?.count);
  }

  @with_error_handling
  async count_monitored_channels() {
    const val = await this.drizzle
      .select({ count: count() })
      .from(schema.Monitors)
      .where(eq(schema.Monitors.is_suspended, false));
    return ok(val[0]?.count);
  }

  @with_error_handling
  async insert_ticket(td: TicketInsertion) {
    await this.ensure_guild(td.guild_id);
    await this.drizzle.insert(schema.Ticket).values(td);
    return ok();
  }

  @with_error_handling
  async get_ticket(ticket_id: string) {
    const res = await this.drizzle.query.Ticket.findFirst({
      where: eq(schema.Ticket.ticket_id, ticket_id),
    });
    if (!res) return err(new TicketNotFound(ticket_id));
    return with_schema(res, ZTicket);
  }

  @with_error_handling
  async get_ticket_id_from_thread(thread_id: string) {
    const res = await this.drizzle
      .select({ ticket_id: schema.Ticket.ticket_id })
      .from(schema.Ticket)
      .where(eq(schema.Ticket.discord_channel_id, thread_id))
      .limit(1);
    return ok(res.at(0)?.ticket_id ?? null);
  }

  @with_error_handling
  async update_ticket(ticket_id: string, data: EditTicket) {
    await this.drizzle
      .update(schema.Ticket)
      .set(data)
      .where(eq(schema.Ticket.ticket_id, ticket_id));
    return ok();
  }

  @with_error_handling
  async create_backup_file(backup_dir: string = this._config.database.backup_path) {
    const backup_file_name = new Date().toISOString() + '.tgz';
    const backup_file_full_path = join(backup_dir, backup_file_name);

    const tar_promise = create_tar(
      {
        gzip: true,
        file: backup_file_full_path,
      },
      [this.raw_db.filename],
    );

    const tar_result = await ResultAsync.fromPromise(tar_promise, map_err);

    if (tar_result.isErr()) return err(tar_result.error);

    return ok({ full_path: resolve_path(backup_file_full_path), file_name: backup_file_name });
  }
}
