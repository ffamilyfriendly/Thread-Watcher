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

export enum ChannelTypes {
	GUILD_TEXT = 0,
	DM = 1,
	GUILD_VOICE = 2,
	GROUP_DM = 3,
	GUILD_CATEGORY = 4,
	GUILD_ANNOUNCEMENT = 5,
	ANNOUNCEMENT_THREAD = 10,
	PUBLIC_THREAD = 11,
	PRIVATE_THREAD = 12,
	GUILD_STAGE_VOICE = 13,
	GUILD_DIRECTORY = 14,
	GUILD_FORUM = 15,
	GUILD_MEDIA = 16
}

export const CAN_BE_MONITOR_TARGET = [
	ChannelTypes.GUILD_TEXT,
	ChannelTypes.GUILD_CATEGORY,
	ChannelTypes.GUILD_ANNOUNCEMENT,
	ChannelTypes.GUILD_FORUM,
	ChannelTypes.GUILD_MEDIA
];
