import z from "zod";

export const ZThreadData = z.object({
  thread_id: z.string(),
  guild_id: z.string(),
  parent_channel_id: z.string().nullish(),
  due_archive: z.coerce.date(),
  is_watched: z.coerce.boolean().default(true),
  managed_by: z.string().nullish(),
});
export type ThreadData = z.output<typeof ZThreadData>;

export const ZThreadSearchData = z.object({
  monitor_id: z.string().nullish(),
  page: z.coerce.number().default(0),
  parent_channel_id: z.string().nullish(),
});
export type ThreadSearchData = z.output<typeof ZThreadSearchData>;

export const ZThreadMetadata = z.object({
  thread_id: z.string(),
  display_name: z.string(),
  last_activity: z.coerce.date(),
  parent_channel: z
    .object({
      channel_id: z.string(),
      display_name: z.string(),
    })
    .optional(),
});
export type ThreadMetadata = z.output<typeof ZThreadMetadata>;

export const ZHydratedThreadData = ZThreadData.extend(ZThreadMetadata.shape);
export type HydratedThreadData = z.output<typeof ZHydratedThreadData>;
