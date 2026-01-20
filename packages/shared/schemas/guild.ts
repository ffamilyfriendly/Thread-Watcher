import z from "zod";

export const ZGuild = z.object({
  guild_id: z.string(),
  left_at: z.coerce.date().nullish(),
  granted_SKU: z.string().nullish(),
});
export type Guild = z.output<typeof ZGuild>;
