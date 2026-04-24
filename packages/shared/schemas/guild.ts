import z from "zod";
import { SETTINGS, type SettingKey } from "../settings";
import { DISCORD_SNOWFLAKE_MAX_LEN, UUID_LEN } from "./tickets/constants";

/*

export const Guilds = sqliteTable('guilds', {
  guild_id: text('guild_id').primaryKey(),
  left_at: integer('left_at', { mode: 'timestamp' }),
  granted_SKU: text('granted_SKU'),
  monthly_budget_eurocents: integer('monthly_budget_eurocents').default(0),
  persistent_budget_eurocents: integer('persistent_budget_eurocents').default(
    config.ai.initial_free_tokens,
  ),
  monthly_budget_last_granted: integer('monthly_budget_last_granted', { mode: 'timestamp' }),
});

*/

export const ZGuildEntitlement = z.object({
  entitlement_id: z.string().max(UUID_LEN),
  guild_id: z.string().max(DISCORD_SNOWFLAKE_MAX_LEN),
  user_id: z.string().max(DISCORD_SNOWFLAKE_MAX_LEN).nullish(),
  sku_id: z.string().max(DISCORD_SNOWFLAKE_MAX_LEN),
  source: z.enum(["discord", "dev_granted", "stripe"]),
  status: z.enum(["ACTIVE", "EXPIRED"]),
  starts_at: z.coerce.date(),
  ends_at: z.coerce.date().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  external_id: z.string().max(255),
  raw: z.unknown().nullish(),
});
export type GuildEntitlement = z.output<typeof ZGuildEntitlement>;

export const ZGuild = z.object({
  guild_id: z.string(),
  left_at: z.coerce.date().nullish(),
  monthly_budget_eurocents: z.number(),
  persistent_budget_eurocents: z.number(),
  monthly_budget_last_granted: z.coerce.date().nullish(),
});
export type Guild = z.output<typeof ZGuild>;

export const ZGuildWithEntitlement = ZGuild.extend({
  entitlements: z.array(ZGuildEntitlement),
});
export type GuildWithEntitlement = z.output<typeof ZGuildWithEntitlement>;

export const ZGuildSubscription = z.object({
  is_subscribed: z.boolean(),
});
export type GuildSubscription = z.output<typeof ZGuildSubscription>;

// I stole this straight up from Gemini. I don't have the willpower to do any zod wrangling tonight.
export const ZGuildSettingsDictWithDefaults = z.object(
  Object.fromEntries(
    Object.entries(SETTINGS).map(([key, def]) => {
      const schema = def.schema as z.ZodTypeAny;
      // Runtime logic: use default if it exists, otherwise allow null
      return [
        key,
        def.default !== null ? schema.default(def.default) : schema.nullable(),
      ];
    }),
  ),
) as unknown as z.ZodObject<{
  [K in SettingKey]: (typeof SETTINGS)[K]["default"] extends null
    ? z.ZodNullable<(typeof SETTINGS)[K]["schema"]>
    : z.ZodDefault<(typeof SETTINGS)[K]["schema"]>;
}>;

export type GuildSettingsDict = z.infer<typeof ZGuildSettingsDictWithDefaults>;
