import * as z from 'zod';

export const ZDiscordGuild = z.object({
	id: z.string(),
	name: z.string(),
	icon: z.string().nullish(),
	banner: z.string().nullish(),
	owner: z.boolean(),
	permissions: z.number(),
	permissions_new: z.string(),
	features: z.unknown().array()
});

export type DiscordGuild = z.infer<typeof ZDiscordGuild>;

interface DiscordGuildExpanded extends DiscordGuild {
	can_add: boolean;
	guild_has_bot: boolean;
	should_not_show: boolean;
	action_link: string;
}

const ZDiscordUser = z.object({
	id: z.string(),
	username: z.string(),
	avatar: z.string(),
	global_name: z.string()
});

export const ZDiscordIdentifyData = z.object({
	user: ZDiscordUser
});

export type DiscordUser = z.infer<typeof ZDiscordIdentifyData>;
