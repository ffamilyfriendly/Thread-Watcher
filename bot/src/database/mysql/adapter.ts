import { err, ok, Result, ResultAsync } from 'neverthrow';
import { ConfigType, MySqlConf } from '#/utilities/config';
import { with_error_handling, with_schema } from '#/database';
import { join, resolve as resolve_path } from 'path';
import { z } from 'zod';
import { create as create_tar } from 'tar';
import { Database, DBResult, EntitlementFilters, TicketInsertion } from '#/interfaces/Database';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { MySql2Database, drizzle } from 'drizzle-orm/mysql2';
import {
  AuditData,
  BaseMonitor,
  EditMonitor,
  FilterData,
  Guild,
  ZAuditData,
  ZMonitor,
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
  ZIntermediaryMessage,
  TicketSummarySegment,
  ZTicketSummarySegment,
  ZMessageAttachment,
  TicketListSearch,
  ZTicketListData,
  ZGuildWithEntitlement,
  GuildEntitlement,
  ZGuildEntitlement,
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
  sql,
  not,
  isNull,
  or,
  SQL,
} from 'drizzle-orm';
import { DatabaseError, TicketNotFound } from '#/utilities/error/def';
import mysql from 'mysql2/promise';
import { logger } from '@providers/logger';
import { map_err } from '#/utilities/error';
import { rm, rmSync } from 'fs';

const full_schema = { ...schema, ...relations };
type FullSchema = typeof full_schema;

export default class MySql implements Database {
  private connection_pool: mysql.Pool;
  private drizzle: MySql2Database<FullSchema>;
  private _config: ConfigType;

  constructor(config: ConfigType) {
    // This should never happen as the database loader acts based on the database flavour.
    // the config zod schema uses a discriminated union so if we've the flavour set as "mysql" we WILL get the correct type and stuff
    if (config.database.flavour !== 'mysql') {
      logger.error("Attempted to initiate 'MySql' database with wrong database config flavour");
      process.exit(1);
    }

    this.connection_pool = mysql.createPool({
      host: config.database.host,
      user: config.database.user,
      password: config.database.password,
      database: config.database.name,
      connectionLimit: config.database.connection_limit,
    });

    this.drizzle = drizzle(this.connection_pool, {
      schema: full_schema,
      mode: 'default',
    });

    this._config = config;
  }

  @with_error_handling
  async get_entitlement(entitlement_id: string) {
    const entitlement = await this.drizzle.query.Entitlements.findFirst({
      where: eq(schema.Entitlements.entitlement_id, entitlement_id),
    });

    return with_schema(entitlement, ZGuildEntitlement.nullable());
  }

  @with_error_handling
  async create_entitlement(entitlement: GuildEntitlement) {
    await this.drizzle.insert(schema.Entitlements).values(entitlement);
    return ok();
  }

  @with_error_handling
  async get_entitlements(filters: EntitlementFilters): DBResult<GuildEntitlement[]> {
    const { guild_id, external_id, source, status } = filters;
    const conditions = [];

    if (guild_id) conditions.push(eq(schema.Entitlements.guild_id, guild_id));
    if (external_id) conditions.push(eq(schema.Entitlements.external_id, external_id));
    if (source) conditions.push(eq(schema.Entitlements.source, source));
    if (status) conditions.push(eq(schema.Entitlements.status, status));

    const results = await this.drizzle
      .select()
      .from(schema.Entitlements)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return with_schema(results, z.array(ZGuildEntitlement));
  }

  @with_error_handling
  async update_entitlement(id: string, data: Partial<GuildEntitlement>) {
    const { entitlement_id: _, ...update_data } = data;

    await this.drizzle
      .update(schema.Entitlements)
      .set({ ...update_data, updated_at: new Date() })
      .where(eq(schema.Entitlements.entitlement_id, id));

    return ok();
  }

  @with_error_handling
  async delete_entitlement(entitlement_id: string) {
    await this.drizzle
      .delete(schema.Entitlements)
      .where(eq(schema.Entitlements.entitlement_id, entitlement_id));
    return ok();
  }

  @with_error_handling
  async get_panel_count(guild_id?: string) {
    const filters: SQL[] = [];

    if (guild_id) filters.push(eq(schema.TicketPanels.guild_id, guild_id));

    const res = await this.drizzle
      .select({ count: count() })
      .from(schema.TicketPanels)
      .where(and(...filters));
    return ok(res[0].count);
  }

  @with_error_handling
  async get_relevant_tickets(user_id: string, guild_id: string) {
    const rows = await this.drizzle.query.Ticket.findMany({
      where: and(
        eq(schema.Ticket.guild_id, guild_id),
        eq(schema.Ticket.status, 'OPEN'),
        or(isNull(schema.Ticket.claimed_by_user_id), eq(schema.Ticket.claimed_by_user_id, user_id)),
      ),
      with: {
        messages: {
          orderBy: [desc(schema.Message.created_at)],
          limit: 1,
        },
      },

      orderBy: [desc(schema.Ticket.created_at)],
      limit: 15,
    });

    const sorted = rows.sort((a, b) => {
      const a_last_msg = a.messages[0];
      const b_last_msg = b.messages[0];

      const a_waiting = a_last_msg?.author_id === a.owner ? 1 : 0;
      const b_waiting = b_last_msg?.author_id === b.owner ? 1 : 0;

      if (a_waiting !== b_waiting) return b_waiting - a_waiting;

      const b_created_at = b.created_at ?? new Date();
      const a_created_at = a.created_at ?? new Date();

      return b_created_at.getTime() - a_created_at.getTime();
    });

    return with_schema(sorted, z.array(ZTicketListData));
  }

  @with_error_handling
  async run_migration() {
    if (this._config.database.flavour !== 'mysql') throw new Error('wrong db flavour');
    const migration_connection = await mysql.createConnection({
      host: this._config.database.host,
      user: this._config.database.user,
      password: this._config.database.password,
      database: this._config.database.name,
      multipleStatements: true,
    });
    const migration_db = drizzle(migration_connection);
    migration_db.execute(sql`SET FOREIGN_KEY_CHECKS = 0;`);
    await migrate(migration_db, { migrationsFolder: './drizzle/mysql' });
    migration_db.execute(sql`SET FOREIGN_KEY_CHECKS = 1;`);
    return ok();
  }

  @with_error_handling
  async delete_old_tickets() {
    await this.drizzle.delete(schema.Ticket).where(lt(schema.Ticket.expires_at, new Date()));
    return ok();
  }

  @with_error_handling
  async get_tickets(filters: TicketListSearch) {
    const applied_filters = [];
    const offset = filters.offset ?? 0;

    if (filters.guild_id) {
      applied_filters.push(eq(schema.Ticket.guild_id, filters.guild_id));
    }

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

    if (filters.expired) {
      applied_filters.push(gt(schema.Ticket.expires_at, new Date()));
    }

    const results = await this.drizzle.query.Ticket.findMany({
      with: {
        messages: {
          limit: 1,
          orderBy: desc(schema.Message.created_at),
        },
      },
      where: and(...applied_filters),
      limit: filters.limit,
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
      where: (attachments, { exists }) =>
        exists(
          this.drizzle
            .select()
            .from(schema.Message)
            .where(
              and(
                eq(schema.Message.message_id, attachments.message_id),
                eq(schema.Message.ticket_id, ticket_id),
              ),
            ),
        ),
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
    const uuid_id = crypto.randomUUID();
    await this.drizzle.insert(schema.TicketNote).values({ ...data, note_id: uuid_id });
    return ok(uuid_id);
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
    this.connection_pool.destroy();
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
    await this.drizzle
      .insert(schema.Guilds)
      .values({ guild_id })
      .onDuplicateKeyUpdate({ set: { guild_id } });
    return ok();
  }

  @with_error_handling
  async insert_ticket_panel(guild_id: string, panel: Omit<TicketPanel, 'panel_id'>) {
    await this.ensure_guild(guild_id);
    const panel_id = crypto.randomUUID();
    await this.drizzle.insert(schema.TicketPanels).values({
      ...panel,
      panel_id: panel_id,
    });

    return ok({ panel_id });
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
  async get_watched_threads_count(guild_id?: string) {
    const filters = [eq(schema.Threads.is_watched, true)];

    if (guild_id) {
      filters.push(eq(schema.Threads.guild_id, guild_id));
    }

    const val = await this.drizzle
      .select({ count: count() })
      .from(schema.Threads)
      .where(and(...filters));

    return ok(val[0]?.count ?? 0);
  }

  static STALE_BUFFER_MINUTES = 5;
  static STALE_BUFFER_MS = this.STALE_BUFFER_MINUTES * 60 * 1000;
  @with_error_handling
  async get_stale_threads(buffer_in_ms = MySql.STALE_BUFFER_MS) {
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
  async get_stale_threads_for_guilds(guild_ids: string[], buffer_in_ms = MySql.STALE_BUFFER_MS) {
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

    const existing = await this.drizzle.query.Settings.findFirst({
      where: and(
        eq(schema.Settings.guild_id, guild_id),
        eq(schema.Settings.setting_id, setting_id),
      ),
    });

    const old_value = existing?.setting_value ?? setting_value;

    await this.drizzle
      .insert(schema.Settings)
      .values({ guild_id, setting_id, setting_value })
      .onDuplicateKeyUpdate({ set: { setting_value } });

    return ok(old_value);
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
    const values = {
      ...channel,
      ...filters,
      role_whitelist: filters?.role_whitelist,
      tags: filters?.tags,
      regex: filters?.regex?.source,
    };
    await this.drizzle.insert(schema.Monitors).values(values).onDuplicateKeyUpdate({ set: values });
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
    await this.drizzle.execute(sqlstmt`
        DELETE FROM ${schema.Audit}
        WHERE UNIX_TIMESTAMP(${schema.Audit.timestamp}) < UNIX_TIMESTAMP() - COALESCE(
            (
                SELECT CAST(${schema.Settings.setting_value} AS UNSIGNED)
                FROM ${schema.Settings}
                WHERE ${schema.Settings.guild_id} = ${schema.Audit.guild_id}
                AND ${schema.Settings.setting_id} = 'AUDIT_LOG_RETENTION'
            ),
            86400
        )
    `);
    return ok();
  }

  @with_error_handling
  async get_guild_info(guild_id: string) {
    const val = await this.drizzle.query.Guilds.findFirst({
      where: eq(schema.Guilds.guild_id, guild_id),
      with: {
        entitlements: {
          where: eq(schema.Entitlements.status, 'ACTIVE'),
        },
      },
    });

    if (!val) return ok(null);

    return with_schema(val, ZGuildWithEntitlement);
  }

  @with_error_handling
  async upsert_guild_info(guild_id: string, data: Partial<Omit<Guild, 'guild_id'>>) {
    await this.drizzle
      .insert(schema.Guilds)
      .values({ guild_id, ...data })
      .onDuplicateKeyUpdate({
        set: data,
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
    const backup_file_name = new Date().toISOString().replace(/:/g, '-') + '.sql';
    const backup_file_full_path = join(backup_dir, backup_file_name);

    const db_config = this._config.database as MySqlConf;

    const proc = Bun.spawnSync([
      'mysqldump',
      '-h',
      db_config.host,
      '-u',
      db_config.user,
      `--password=${db_config.password}`,
      '--single-transaction',
      '--routines',
      '--triggers',
      db_config.name,
      '--result-file',
      backup_file_full_path,
    ]);

    if (proc.exitCode !== 0) return err(new Error(`mysqldump failed: ${proc.stderr.toString()}`));

    const compressed_backup_file_full_path = backup_file_full_path + '.tgz';
    const tar_promise = create_tar(
      {
        gzip: true,
        file: compressed_backup_file_full_path,
      },
      [backup_file_full_path],
    );

    const tar_result = await ResultAsync.fromPromise(tar_promise, map_err);

    if (tar_result.isErr()) return err(tar_result.error);
    else {
      const could_delete_file = Result.fromThrowable(rmSync)(backup_file_full_path);
      if (could_delete_file.isErr()) {
        logger.warn(
          `could not delete uncompressed backup file @ '${backup_file_full_path}'`,
          could_delete_file.error,
        );
      }
    }

    return ok({
      full_path: resolve_path(compressed_backup_file_full_path),
      file_name: backup_file_name + '.tgz',
    });
  }
}
