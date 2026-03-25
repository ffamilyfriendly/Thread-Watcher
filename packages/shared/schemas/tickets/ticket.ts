import { type TicketPanel } from "./entities";

export * from "./pipeline";
export * from "./entities";
export * from "./discord";
export * from "./constants";
export * from "./ticket_view";

export const DEFAULT_TICKET_PANEL: (s: string) => TicketPanel = (
  guild_id: string,
) => ({
  panel_id: "NEW_REQUIRES_ID_BLAH",
  guild_id,
  description: "",
  should_watch_ticket: true,
  should_GPT_summarize_ticket: true,
  initial_assigned_roles: [],
  initial_channel_id: "",
  resolve_behaviour: "LOCK_THREAD",
  commencement_embed: {
    title: "Open Ticket",
    colour: "#1c2d69",
    fields: [],
  },
  resolve_embed: {
    title: "Ticket Closed",
    colour: "#211a2e",
    fields: [],
  },
  pipeline: [],
  commencement_method: {
    type: "BUTTON",
    button_text: "open ticket",
  },
});
