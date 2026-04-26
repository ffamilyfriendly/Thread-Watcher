import z from "zod";
import {
  ZGuild,
  ZGuildSettingsDictWithDefaults,
  ZGuildWithEntitlement,
} from "./guild";
import { ZTicketListData } from "./tickets/entities";
import { ZAuditData } from "./audit";
import { ZTopggWebhookSchema } from "./topgg";
import { ZDiscordChannel, ZDiscordRole, ZDJSGuild } from "./tickets/discord";

export const ZDashboardData = z.object({
  guild: ZGuild.nullish(),
  guild_settings: ZGuildSettingsDictWithDefaults,
  ticket_panels_count: z.number(),
  monitors_count: z.number(),
  relevant_tickets: z.array(ZTicketListData),
  recent_audits: z.array(ZAuditData),
  threads_count: z.number(),
});
export type DashboardData = z.output<typeof ZDashboardData>;

export const ZLandingPageData = z.object({
  guild_count: z.number(),
  watched_threads_count: z.number(),
  ticket_panels_count: z.number(),
});
export type LandingPageData = z.output<typeof ZLandingPageData>;

export const ZGuildOverview = z.object({
  entitlements: z.object({
    has_premium: z.boolean(),
    active_topgg_vote: ZTopggWebhookSchema.nullish(),
  }),
  guild: ZGuildWithEntitlement,
  guild_data: ZDJSGuild,
  roles: z.array(ZDiscordRole),
  channels: z.array(ZDiscordChannel),
});

export type GuildOverview = z.output<typeof ZGuildOverview>;
