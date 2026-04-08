import z from "zod";
import { ZGuild } from "./guild";
import { ZTicketListData } from "./tickets/entities";
import { ZAuditData } from "./audit";

export const ZDashboardData = z.object({
  guild: ZGuild.nullish(),
  ticket_panels_count: z.number(),
  monitors_count: z.number(),
  relevant_tickets: z.array(ZTicketListData),
  recent_audits: z.array(ZAuditData),
});
export type DashboardData = z.output<typeof ZDashboardData>;

export const ZLandingPageData = z.object({
  guild_count: z.number(),
  watched_threads_count: z.number(),
  ticket_panels_count: z.number(),
});
export type LandingPageData = z.output<typeof ZLandingPageData>;
