import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const date_now = () => new Date();
const random_id = () => crypto.randomUUID();

export const Threads = sqliteTable('threads', {
  thread_id: text('thread_id').primaryKey(),
  guild_id: text('guild_id')
    .notNull()
    .references(() => Guilds.guild_id, { onDelete: 'cascade' }),
  parent_channel_id: text('parent_channel_id'),
  due_archive: integer('due_archive', { mode: 'timestamp' }).notNull(),
  is_watched: integer('is_watched', { mode: 'boolean' }).notNull(),
  managed_by: text('managed_by'),
  fail_count: integer('fail_count'),
  next_retry: integer('next_retry', { mode: 'timestamp' }),
});

export const Monitors = sqliteTable('monitors', {
  target_id: text('target_id').primaryKey(),
  guild_id: text('guild_id')
    .notNull()
    .references(() => Guilds.guild_id, { onDelete: 'cascade' }),
  regex: text('regex'),
  role_whitelist: text('role_whitelist', { mode: 'json' }),
  tags: text('tags', { mode: 'json' }),
  is_suspended: integer('is_suspended', { mode: 'boolean' }).default(false),
});

export const Settings = sqliteTable(
  'settings',
  {
    setting_id: text('setting_id').notNull(),
    guild_id: text('guild_id')
      .notNull()
      .references(() => Guilds.guild_id, { onDelete: 'cascade' }),
    setting_value: text('setting_value').notNull(),
  },
  (t) => [primaryKey({ columns: [t.setting_id, t.guild_id] })],
);

export const Audit = sqliteTable('audit', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  guild_id: text('guild_id')
    .notNull()
    .references(() => Guilds.guild_id, { onDelete: 'cascade' }),
  executor_id: text('executor_id').notNull(),
  data: text('data', { mode: 'json' }).notNull(),
  reason: text('reason'),
  timestamp: integer('timestamp', { mode: 'timestamp' }).$defaultFn(date_now),
});

export const Guilds = sqliteTable('guilds', {
  guild_id: text('guild_id').primaryKey(),
  left_at: integer('left_at', { mode: 'timestamp' }),
  granted_SKU: text('granted_SKU'),
  monthly_budget_eurocents: integer('monthly_budget_eurocents').default(0),
  persistent_budget_eurocents: integer('persistent_budget_eurocents').default(6969),
  monthly_budget_last_granted: integer('monthly_budget_last_granted', { mode: 'timestamp' }),
});

export const TicketPanels = sqliteTable('ticketpanels', {
  panel_id: text('panel_id').$defaultFn(random_id).primaryKey(),
  guild_id: text('guild_id').references(() => Guilds.guild_id, { onDelete: 'cascade' }),
  name: text('name'),
  description: text('description'),
  should_watch_ticket: integer('should_watch_ticket', { mode: 'boolean' }).notNull(),
  should_GPT_summarize_ticket: integer('should_GPT_summarize_ticket', {
    mode: 'boolean',
  }).notNull(),
  discord_message_id: text('discord_message_id'),
  initial_assigned_roles: text('initial_assigned_roles', { mode: 'json' }).notNull(),
  initial_channel_id: text('initial_channel_id').notNull(),
  commencement_embed: text('commencement_embed', { mode: 'json' }).notNull(),
  commencement_method: text('commencement_method', { mode: 'json' }).notNull(),
  resolve_embed: text('resolve_embed', { mode: 'json' }).notNull(),
  resolve_behaviour: text('resolve_behaviour').notNull(),
  pipeline: text('pipeline', { mode: 'json' }).notNull(),
});

export const Ticket = sqliteTable('tickets', {
  ticket_id: text('ticket_id').$defaultFn(random_id).primaryKey(),
  guild_id: text('guild_id')
    .notNull()
    .references(() => Guilds.guild_id, { onDelete: 'cascade' }),
  expires_at: integer({ mode: 'timestamp' }),
  discord_channel_id: text('discord_channel_id').notNull().unique(),
  start_message_id: text('start_message_id').notNull().unique(),
  name: text('name').notNull(),
  owner: text('owner').notNull(),
  variable_dump: text('variable_dump', { mode: 'json' }).notNull(),
  status: text('status').notNull().default('OPEN'),
  panel_id: text('panel_id').references(() => TicketPanels.panel_id, { onDelete: 'set null' }),
  assigned_to_roles: text('assigned_to_roles', { mode: 'json' }).notNull(),
  claimed_by_user_id: text('claimed_by_user_id'),
  created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(date_now),
  closed_at: integer('closed_at', { mode: 'timestamp' }),
  master_summary: text(),
});

export const TicketNote = sqliteTable('ticket_notes', {
  note_id: text().$defaultFn(random_id).primaryKey(),
  ticket_id: text()
    .notNull()
    .references(() => Ticket.ticket_id, { onDelete: 'cascade' }),
  created_by: text().notNull(),
  created_at: integer({ mode: 'timestamp' }).$defaultFn(date_now),
  text: text().notNull(),
});

export const MessageAttachment = sqliteTable('ticket_message_attachments', {
  attachment_id: text().$defaultFn(random_id).primaryKey(),
  message_id: text()
    .notNull()
    .references(() => Message.message_id, { onDelete: 'cascade' }),
  filename: text().notNull(),
  url: text().notNull(),
  file_size: integer(),
  cdn_path: text().notNull(),
  content_type: text(),
  file_width: integer(),
  file_height: integer(),
  marked_nsfw: integer({ mode: 'boolean' }),
  flag: text(),
});

export const Message = sqliteTable('ticket_message', {
  message_id: text().$defaultFn(random_id).primaryKey(),
  ticket_id: text()
    .notNull()
    .references(() => Ticket.ticket_id, { onDelete: 'cascade' }),
  author_id: text().notNull(),
  reply_to_message_id: text().references((): any => Message.message_id, { onDelete: 'set null' }),
  created_at: integer({ mode: 'timestamp' }).$defaultFn(date_now).notNull(),
  text_content: text(),
  embeds: text({ mode: 'json' }),
});

export const TicketSummary = sqliteTable('ticket_summary_segments', {
  summary_id: text().$defaultFn(random_id).primaryKey(),
  ticket_id: text()
    .notNull()
    .references(() => Ticket.ticket_id, { onDelete: 'cascade' }),
  start_message_id: text().references(() => Message.message_id, { onDelete: 'set null' }),
  end_message_id: text().references(() => Message.message_id, { onDelete: 'set null' }),
  involved_users: text({ mode: 'json' }),
  created_at: integer({ mode: 'timestamp' }).$defaultFn(date_now).notNull(),
  summary_text: text(),
  summary_title: text(),
  is_master_summary: integer({ mode: 'boolean' }),
});

export const Entitlements = sqliteTable('entitlements', {
  entitlement_id: text('entitlement_id').$defaultFn(random_id).primaryKey(),
  guild_id: text('guild_id')
    .notNull()
    .references(() => Guilds.guild_id, { onDelete: 'cascade' }),
  user_id: text('user_id'),
  sku_id: text('sku_id').notNull(),
  source: text('source').notNull(),
  status: text('status').notNull().default('ACTIVE'),
  starts_at: integer('starts_at', { mode: 'timestamp' }).notNull(),
  ends_at: integer('ends_at', { mode: 'timestamp' }),
  created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(date_now),
  updated_at: integer('updated_at', { mode: 'timestamp' }).$defaultFn(date_now),
  external_id: text('external_id').unique(),
  raw: text('raw', { mode: 'json' }),
});
