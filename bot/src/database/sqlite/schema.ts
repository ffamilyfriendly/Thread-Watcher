import { config } from '@providers/config';
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
  monthly_tokens: integer('monthly_tokens').default(0),
  persistent_tokens: integer('persistent_tokens').default(config.ai.initial_free_tokens),
  monthly_tokens_last_granted: integer('monthly_tokens_last_granted', { mode: 'timestamp' }),
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
  pipeline: text('pipeline', { mode: 'json' }).notNull(),
});

export const Ticket = sqliteTable('tickets', {
  ticket_id: text('ticket_id').$defaultFn(random_id).primaryKey(),
  guild_id: text('guild_id')
    .notNull()
    .references(() => Guilds.guild_id, { onDelete: 'cascade' }),
  discord_channel_id: text('discord_channel_id').notNull(),
  name: text('name').notNull(),
  owner: text('owner').notNull(),
  variable_dump: text('variable_dump', { mode: 'json' }).notNull(),
  status: text('status').notNull().default('OPEN'),
  panel_id: text('panel_id')
    .notNull()
    .references(() => TicketPanels.panel_id),
  assigned_to_roles: text('assined_to_roles', { mode: 'json' }).notNull(),
  claimed_by_user_id: text('claimed_by_user_id'),
  created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(date_now),
  closed_at: integer('closed_at', { mode: 'timestamp' }),
});
