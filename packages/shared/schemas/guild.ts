import z from "zod";

export const ZGuild = z.object({
  guild_id: z.string(),
  left_at: z.coerce.date().nullish(),
  granted_SKU: z.string().nullish(),
  monthly_tokens: z.number(),
  persistent_tokens: z.number(),
  monthly_tokens_last_granted: z.coerce.date().nullish(),
});
export type Guild = z.output<typeof ZGuild>;

export const ZGuildSubscription = z.object({
  is_subscribed: z.boolean(),
});
export type GuildSubscription = z.output<typeof ZGuildSubscription>;
