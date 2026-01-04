import z from 'zod';

export const ZGuildOverview = z.object({
	threads_watched: z.number(),
	monitors_active: z.number(),
	owned_by_shard: z.number()
});

export type GuildOverview = z.infer<typeof ZGuildOverview>;
