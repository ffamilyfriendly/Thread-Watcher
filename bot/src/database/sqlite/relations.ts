import { relations } from 'drizzle-orm';
import * as schema from './schema';

export const ticketRelations = relations(schema.Ticket, ({ one, many }) => ({
  panel: one(schema.TicketPanels, {
    fields: [schema.Ticket.panel_id],
    references: [schema.TicketPanels.panel_id],
  }),
  messages: many(schema.Message),
  summaries: many(schema.TicketSummary),
  notes: many(schema.TicketNote),
}));

export const messageRelations = relations(schema.Message, ({ one, many }) => ({
  ticket: one(schema.Ticket, {
    fields: [schema.Message.ticket_id],
    references: [schema.Ticket.ticket_id],
  }),
  attachments: many(schema.MessageAttachment),
  parentMessage: one(schema.Message, {
    fields: [schema.Message.reply_to_message_id],
    references: [schema.Message.message_id],
    relationName: 'replies',
  }),
}));

export const attachmentRelations = relations(schema.MessageAttachment, ({ one }) => ({
  message: one(schema.Message, {
    fields: [schema.MessageAttachment.message_id],
    references: [schema.Message.message_id],
  }),
}));

export const ticketSummaryRelations = relations(schema.TicketSummary, ({ one }) => ({
  ticket: one(schema.Ticket, {
    fields: [schema.TicketSummary.ticket_id],
    references: [schema.Ticket.ticket_id],
  }),
}));

export const ticketNoteRelations = relations(schema.TicketNote, ({ one }) => ({
  ticket: one(schema.Ticket, {
    fields: [schema.TicketNote.ticket_id],
    references: [schema.Ticket.ticket_id],
  }),
}));

export const ticketPanelRelations = relations(schema.TicketPanels, ({ one, many }) => ({
  guild: one(schema.Guilds, {
    fields: [schema.TicketPanels.guild_id],
    references: [schema.Guilds.guild_id],
  }),
  tickets: many(schema.Ticket),
}));

export const guildRelations = relations(schema.Guilds, ({ many }) => ({
  entitlements: many(schema.Entitlements),
  monitors: many(schema.Monitors),
  threads: many(schema.Threads),
  settings: many(schema.Settings),
  audit: many(schema.Audit),
}));

export const entitlementRelations = relations(schema.Entitlements, ({ one }) => ({
  guild: one(schema.Guilds, {
    fields: [schema.Entitlements.guild_id],
    references: [schema.Guilds.guild_id],
  }),
}));

export const monitorRelations = relations(schema.Monitors, ({ one }) => ({
  guild: one(schema.Guilds, {
    fields: [schema.Monitors.guild_id],
    references: [schema.Guilds.guild_id],
  }),
}));

export const threadRelations = relations(schema.Threads, ({ one }) => ({
  guild: one(schema.Guilds, {
    fields: [schema.Threads.guild_id],
    references: [schema.Guilds.guild_id],
  }),
}));
