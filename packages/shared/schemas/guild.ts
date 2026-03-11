import z from "zod";

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

export const ZGuild = z.object({
  guild_id: z.string(),
  left_at: z.coerce.date().nullish(),
  granted_SKU: z.string().nullish(),
  monthly_budget_eurocents: z.number(),
  persistent_budget_eurocents: z.number(),
  monthly_budget_last_granted: z.coerce.date().nullish(),
});
export type Guild = z.output<typeof ZGuild>;

export const ZGuildSubscription = z.object({
  is_subscribed: z.boolean(),
});
export type GuildSubscription = z.output<typeof ZGuildSubscription>;
