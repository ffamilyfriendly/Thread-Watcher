import z from "zod";

export const ZTopggWebhookSchema = z.object({
  bot: z.string(),
  user: z.string(),
  type: z.enum(["upvote", "test"]),
  isWeekend: z.boolean().default(false),
  query: z.string().nullish(),
});
