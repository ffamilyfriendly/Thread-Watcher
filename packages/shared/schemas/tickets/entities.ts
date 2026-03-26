import z from "zod";
import { TW_PANEL_NAME_MAX, TW_PANEL_NAME_MIN } from "./constants";
import {
  ZButtonStart,
  ZDiscordUser,
  ZEmbed,
  ZNativeDiscordEmbed,
  ZSelectionStart,
} from "./discord";
import { ZPipeline } from "./pipeline";

export const ZTicketPanelMeta = z.object({
  panel_id: z.string().min(TW_PANEL_NAME_MIN).max(TW_PANEL_NAME_MAX),
  guild_id: z.string(),
  name: z.string().nullish(),
  description: z.string().nullish(),
});
export type TicketPanelMetaObj = z.output<typeof ZTicketPanelMeta>;

// Panel related stuff
export const ZTicketPanel = ZTicketPanelMeta.extend({
  should_watch_ticket: z.coerce.boolean(),
  should_GPT_summarize_ticket: z.coerce.boolean(),
  discord_message_id: z.string().nullish(), // The message ID of the panel. Used to edit updated panels / check if we've sent the panel message
  initial_assigned_roles: z.array(z.string()), // The roles that will be assigned to the ticket (if pipeline does not alter)
  initial_channel_id: z.string(), // The channel the ticket will open in (if pipeline does not alter)
  commencement_embed: ZEmbed,
  commencement_method: z.union([ZButtonStart, ZSelectionStart]),
  resolve_embed: ZEmbed,
  resolve_behaviour: z.enum(["DELETE_THREAD", "LOCK_THREAD", "NOTHING"]),
  pipeline: ZPipeline,
});

export const ZEditTicketPanel = ZTicketPanel.partial();

const ZTicketStates = z.enum(["OPEN", "CLOSED"]);

export const ZTicket = z.object({
  ticket_id: z.string(),
  guild_id: z.string(),
  discord_channel_id: z.string(),
  name: z.string(),
  owner: z.string(),
  panel_id: z.string(),
  variable_dump: z.record(z.string(), z.unknown()),
  status: ZTicketStates,
  assigned_to_roles: z.array(z.string()),
  claimed_by_user_id: z.string().nullish(),
  created_at: z.coerce.date(),
  closed_at: z.coerce.date().nullish(),
  start_message_id: z.string(),
});

export const ZTicketListData = ZTicket.omit({ variable_dump: true }).extend({
  last_activity: z.coerce.date(),
});
export type TicketListData = z.output<typeof ZTicketListData>;

export const ZTicketListSearchData = z.object({
  panel_id: z.string().nullish(),
  status: ZTicketStates.nullish(),
  assigned_to_user_id: z.string().nullish(),
  limit: z.number().default(50),
  offset: z.number().default(0),
  ticket_owner: z.string().nullish(),
  guild_id: z.string(),
});
export type TicketListSearch = z.output<typeof ZTicketListSearchData>;

export const ZEditTicket = ZTicket.omit({
  ticket_id: true,
  guild_id: true,
  discord_channel_id: true,
  variable_dump: true,
  panel_id: true,
  created_at: true,
}).partial();

export const ZTicketNote = z.object({
  note_id: z.string(),
  ticket_id: z.string(),
  created_by: z.string(),
  created_at: z.coerce.date(),
  text: z.string().min(5).max(100),
});
export type TicketNote = z.output<typeof ZTicketNote>;

export const ZInsertTicketNote = ZTicketNote.omit({
  note_id: true,
  created_at: true,
});
export type InsertTicketNote = z.output<typeof ZInsertTicketNote>;

export type Ticket = z.output<typeof ZTicket>;
export type TicketPanel = z.output<typeof ZTicketPanel>;
export type EditTicketPanel = z.output<typeof ZEditTicketPanel>;
export type EditTicket = z.output<typeof ZEditTicket>;
export type TicketPanelMeta = Omit<TicketPanel, "id">;

export const ZMessageAttachment = z.object({
  attachment_id: z.string(),
  message_id: z.string(),
  cdn_path: z.string(),
  filename: z.string(),
  url: z.string(),
  file_size: z.number(),
  content_type: z.string().nullish(),
  file_width: z.number().nullish(),
  file_height: z.number().nullish(),
  marked_nsfw: z.boolean(),
  flag: z
    .enum([
      "EXCEEDS_FREE_FILE_LIMIT",
      "EXCEEDS_SIZE_LIMIT",
      "IS_QUARANTINED",
      "SPOOKY_FILE",
      "UPLOAD_FAILED",
      "IS_UPLOADING",
      "NO_FILE_ENDING",
      "SUSPICIOUS_FILENAME",
    ])
    .nullish(),
});
export type TicketMessageAttachment = z.output<typeof ZMessageAttachment>;

export const ZPublicMessageAttachment = ZMessageAttachment.omit({
  cdn_path: true,
}).extend({
  access_url: z.string(),
});
export type PublicTicketMessageAttachment = z.output<
  typeof ZPublicMessageAttachment
>;

export const ZTicketMessage = z.object({
  message_id: z.string(),
  ticket_id: z.string(),
  author_id: z.string(),
  reply_to_message_id: z.string().nullish(),
  created_at: z.coerce.date(),
  text_content: z.string().nullish(),
  embeds: z.array(ZNativeDiscordEmbed).default([]),
});
export type TicketMessage = z.output<typeof ZTicketMessage>;

export const ZTicketSummarySegment = z.object({
  summary_id: z.string(),
  ticket_id: z.string(),
  start_message_id: z.string(),
  end_message_id: z.string(),
  involved_users: z.array(z.string()).default([]),
  created_at: z.coerce.date(),
  summary_text: z.string(),
  summary_title: z.string().nullish().default("untitled"),
});
export type TicketSummarySegment = z.output<typeof ZTicketSummarySegment>;

export const ZPublicTicketMessage = ZTicketMessage.extend({
  attachments: z.array(ZPublicMessageAttachment).default([]),
});
export type PublicTicketMessage = z.output<typeof ZPublicTicketMessage>;

export const ZMessagesView = z.object({
  messages: z.array(ZPublicTicketMessage).default([]),
  users: z.record(z.string(), ZDiscordUser).default({}),
});
export type MessagesView = z.output<typeof ZMessagesView>;

export const ZTicketView = ZTicket.extend({
  messages: z.array(ZPublicTicketMessage).default([]),
  users: z.record(z.string(), ZDiscordUser).default({}),
  summaries: z.array(ZTicketSummarySegment).default([]),
  notes: z.array(ZTicketNote).default([]),
});
export type TicketView = z.output<typeof ZTicketView>;

export const ZIntermediaryMessage = ZTicketMessage.extend({
  attachments: z.array(ZMessageAttachment).default([]),
});
export type IntermediaryMessage = z.output<typeof ZIntermediaryMessage>;

export const ZIntermediaryTicketView = ZTicket.extend({
  messages: z.array(ZIntermediaryMessage).default([]),
  summaries: z.array(ZTicketSummarySegment).default([]),
  notes: z.array(ZTicketNote).default([]),
});
export type IntermediaryTicketView = z.output<typeof ZIntermediaryTicketView>;
