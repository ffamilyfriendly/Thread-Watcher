import { config } from '@providers/config';
import { DISCORD_SNOWFLAKE_MAX_LEN, UUID_LEN } from '@watcher/shared';
import {
  boolean,
  datetime,
  decimal,
  int,
  json,
  mediumint,
  mysqlTable,
  primaryKey,
  smallint,
  text,
  varchar,
} from 'drizzle-orm/mysql-core';

const date_now = () => new Date();
const random_id = () => crypto.randomUUID();

export const Threads = mysqlTable('threads', {
  thread_id: varchar('thread_id', { length: DISCORD_SNOWFLAKE_MAX_LEN }).primaryKey(),
  guild_id: varchar('guild_id', { length: DISCORD_SNOWFLAKE_MAX_LEN })
    .notNull()
    .references(() => Guilds.guild_id, { onDelete: 'cascade' }),
  parent_channel_id: text('parent_channel_id'),
  due_archive: datetime('due_archive').notNull(),
  is_watched: boolean('is_watched').notNull(),
  managed_by: text('managed_by'),
});

export const Monitors = mysqlTable('monitors', {
  target_id: varchar('target_id', { length: DISCORD_SNOWFLAKE_MAX_LEN }).primaryKey(),
  guild_id: varchar('guild_id', { length: DISCORD_SNOWFLAKE_MAX_LEN })
    .notNull()
    .references(() => Guilds.guild_id, { onDelete: 'cascade' }),
  regex: text('regex'),
  role_whitelist: json('role_whitelist'),
  tags: json('tags'),
  is_suspended: boolean('is_suspended').default(false),
});

export const Settings = mysqlTable(
  'settings',
  {
    setting_id: varchar('setting_id', { length: DISCORD_SNOWFLAKE_MAX_LEN }).notNull(),
    guild_id: varchar('guild_id', { length: DISCORD_SNOWFLAKE_MAX_LEN })
      .notNull()
      .references(() => Guilds.guild_id, { onDelete: 'cascade' }),
    setting_value: text('setting_value').notNull(),
  },
  (t) => [primaryKey({ columns: [t.setting_id, t.guild_id] })],
);

export const Audit = mysqlTable('audit', {
  id: mediumint('id', { unsigned: true }).primaryKey().autoincrement(),
  guild_id: varchar('guild_id', { length: DISCORD_SNOWFLAKE_MAX_LEN })
    .notNull()
    .references(() => Guilds.guild_id, { onDelete: 'cascade' }),
  executor_id: text('executor_id').notNull(),
  data: json('data').notNull(),
  reason: text('reason'),
  timestamp: datetime('timestamp').$defaultFn(date_now),
});

export const Guilds = mysqlTable('guilds', {
  guild_id: varchar('guild_id', { length: DISCORD_SNOWFLAKE_MAX_LEN }).primaryKey(),
  left_at: datetime('left_at'),
  granted_SKU: text('granted_SKU'),
  monthly_budget_eurocents: int('monthly_budget_eurocents').default(0),
  persistent_budget_eurocents: int('persistent_budget_eurocents').default(
    config.ai.initial_free_tokens,
  ),
  monthly_budget_last_granted: datetime('monthly_budget_last_granted'),
});

export const TicketPanels = mysqlTable('ticketpanels', {
  panel_id: varchar('panel_id', { length: UUID_LEN }).$defaultFn(random_id).primaryKey(),
  guild_id: varchar('guild_id', { length: DISCORD_SNOWFLAKE_MAX_LEN }).references(
    () => Guilds.guild_id,
    { onDelete: 'cascade' },
  ),
  name: text('name'),
  description: text('description'),
  should_watch_ticket: boolean('should_watch_ticket').notNull(),
  should_GPT_summarize_ticket: boolean('should_GPT_summarize_ticket').notNull(),
  discord_message_id: text('discord_message_id'),
  initial_assigned_roles: json('initial_assigned_roles').notNull(),
  initial_channel_id: text('initial_channel_id').notNull(),
  commencement_embed: json('commencement_embed').notNull(),
  commencement_method: json('commencement_method').notNull(),
  resolve_embed: json('resolve_embed').notNull(),
  resolve_behaviour: text('resolve_behaviour').notNull(),
  pipeline: json('pipeline').notNull(),
});

export const Ticket = mysqlTable('tickets', {
  ticket_id: varchar('ticket_id', { length: UUID_LEN }).$defaultFn(random_id).primaryKey(),
  guild_id: varchar('guild_id', { length: DISCORD_SNOWFLAKE_MAX_LEN })
    .notNull()
    .references(() => Guilds.guild_id, { onDelete: 'cascade' }),
  expires_at: datetime('expires_at'),
  discord_channel_id: varchar('discord_channel_id', { length: DISCORD_SNOWFLAKE_MAX_LEN })
    .notNull()
    .unique(),
  start_message_id: varchar('start_message_id', { length: DISCORD_SNOWFLAKE_MAX_LEN })
    .notNull()
    .unique(),
  name: text('name').notNull(),
  owner: text('owner').notNull(),
  variable_dump: json('variable_dump').notNull(),
  status: text('status').notNull().default('OPEN'),
  panel_id: varchar('panel_id', { length: UUID_LEN }).references(() => TicketPanels.panel_id, {
    onDelete: 'set null',
  }),
  assigned_to_roles: json('assigned_to_roles').notNull(),
  claimed_by_user_id: text('claimed_by_user_id'),
  created_at: datetime('created_at').$defaultFn(date_now),
  closed_at: datetime('closed_at'),
  master_summary: text(),
});

// t_ = ticket
// had to make it less verbose due to mysql table name length constraints.
export const TicketNote = mysqlTable('t_notes', {
  note_id: varchar('note_id', { length: UUID_LEN }).$defaultFn(random_id).primaryKey(),
  ticket_id: varchar('ticket_id', { length: UUID_LEN })
    .notNull()
    .references(() => Ticket.ticket_id, { onDelete: 'cascade' }),
  created_by: text('created_by').notNull(),
  created_at: datetime('created_at').$defaultFn(date_now),
  text: text('text').notNull(),
});

export const MessageAttachment = mysqlTable('t_message_attachments', {
  attachment_id: varchar('attachment_id', { length: DISCORD_SNOWFLAKE_MAX_LEN }).primaryKey(),
  message_id: varchar('message_id', { length: DISCORD_SNOWFLAKE_MAX_LEN })
    .notNull()
    .references(() => Message.message_id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  url: text('url').notNull(),
  file_size: int('file_size'),
  cdn_path: text('cdn_path').notNull(),
  content_type: text('content_type'),
  file_width: smallint('file_width'),
  file_height: smallint('file_height'),
  marked_nsfw: boolean('marked_nsfw'),
  flag: text('flag'),
});

export const Message = mysqlTable('t_message', {
  message_id: varchar('message_id', { length: DISCORD_SNOWFLAKE_MAX_LEN }).primaryKey(),
  ticket_id: varchar('ticket_id', { length: UUID_LEN })
    .notNull()
    .references(() => Ticket.ticket_id, { onDelete: 'cascade' }),
  author_id: varchar('author_id', { length: DISCORD_SNOWFLAKE_MAX_LEN }).notNull(),
  reply_to_message_id: varchar('reply_to_message_id', {
    length: DISCORD_SNOWFLAKE_MAX_LEN,
  }).references((): any => Message.message_id, { onDelete: 'set null' }),
  created_at: datetime('created_at').$defaultFn(date_now).notNull(),
  text_content: text('text_content'),
  embeds: json('embeds'),
});

export const TicketSummary = mysqlTable('t_summary_segments', {
  summary_id: varchar('summary_id', { length: UUID_LEN }).$defaultFn(random_id).primaryKey(),
  ticket_id: varchar('ticket_id', { length: UUID_LEN })
    .notNull()
    .references(() => Ticket.ticket_id, { onDelete: 'cascade' }),
  start_message_id: varchar('start_message_id', { length: DISCORD_SNOWFLAKE_MAX_LEN }).references(
    () => Message.message_id,
    { onDelete: 'set null' },
  ),
  end_message_id: varchar('end_message_id', { length: DISCORD_SNOWFLAKE_MAX_LEN }).references(
    () => Message.message_id,
    { onDelete: 'set null' },
  ),
  involved_users: json('involved_users'),
  created_at: datetime('created_at').$defaultFn(date_now).notNull(),
  summary_text: text('summary_text'),
  summary_title: text('summary_title'),
  is_master_summary: boolean('is_master_summary'),
});

export const Entitlements = mysqlTable('entitlements', {
  entitlement_id: varchar('entitlement_id', { length: UUID_LEN })
    .primaryKey()
    .$defaultFn(random_id),
  guild_id: varchar('guild_id', { length: DISCORD_SNOWFLAKE_MAX_LEN })
    .notNull()
    .references(() => Guilds.guild_id, { onDelete: 'cascade' }),
  user_id: varchar('user_id', { length: DISCORD_SNOWFLAKE_MAX_LEN }),
  sku_id: varchar('sku_id', { length: DISCORD_SNOWFLAKE_MAX_LEN }).notNull(),
  source: text('source').notNull(),
  status: text('status').notNull().default('ACTIVE'),
  starts_at: datetime('starts_at').notNull(),
  ends_at: datetime('ends_at'),
  created_at: datetime('created_at').$defaultFn(date_now),
  updated_at: datetime('updated_at').$defaultFn(date_now),
  external_id: varchar('external_id', { length: 255 }).unique(),
  raw: json('raw'),
});
