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
