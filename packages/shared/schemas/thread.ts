import z from "zod";

export const ZThreadData = z.object({
  id: z.string(),
  server: z.string(),
  parent_channel_id: z.string().nullish(),
  due_archive: z.coerce.date(),
  is_watched: z.coerce.boolean().default(true),
  managed_by: z.string().nullish(),
});
export type ThreadData = z.output<typeof ZThreadData>;
