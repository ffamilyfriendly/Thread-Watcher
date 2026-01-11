import z from 'zod';

export const ZRawSetting = z.object({
	setting_id: z.string(),
	guild_id: z.string(),
	setting_value: z.string()
});

export const ZMappedSettings = z.object({
	LOGGING_CHANNEL: z.string().nullish(),
	BUMP_BEHAVIOUR: z.string().nullish().default('BUMP_AND_UNARCHIVE'),
	BOT_MASTER_ROLE: z.string().nullish()
});

export const ZDiscordEntitlement = z.object({
	consumed: z.boolean(),
	deleted: z.boolean(),
	endsAt: z.date().nullish(),
	endsTimestamp: z.number().nullish(),
	guild: z.string().nullish(),
	guildId: z.string().nullish(),
	id: z.string().nullish(),
	skuId: z.string(),
	startsAt: z.date().nullish(),
	startsTimestamp: z.number().nullish()
});

export const ZGuildOverview = z.object({
	threads_watched: z.number(),
	monitors_active: z.number(),
	owned_by_shard: z.number(),
	guild_settings: ZMappedSettings,
	entitlements: z.array(ZDiscordEntitlement)
});

export type GuildOverview = z.output<typeof ZGuildOverview>;

/*
export interface AuditData {
  id: number;
  guild_id: string;
  executor_id: string;
  target_id?: string;
  old_value?: string;
  new_value?: string;
  reason?: string;
  error?: string;
  exec_time_ms?: number;
  command_name?: string;
  timestamp: number;
  audit_type: string;
}
*/
export const ZAuditLog = z.object({
	id: z.number(),
	guild_id: z.string(),
	executor_id: z.string(),
	target_id: z.string().nullable(),
	old_value: z.string().nullable(),
	new_value: z.string().nullable(),
	reason: z.string().nullable(),
	error: z.string().nullable(),
	exec_time_ms: z.number().nullable(),
	command_name: z.string().nullable(),
	timestamp: z.string(),
	audit_type: z.string()
});
export type AuditLog = z.output<typeof ZAuditLog>;

export const ZAuditLogResponse = z.object({
	logs: z.array(ZAuditLog),
	next_cursor: z.number().nullish()
});
export type AuditLogResponse = z.output<typeof ZAuditLogResponse>;

/*
	These may be called ZDiscord<Obj> but they are objects from discord.js proxied thru our API so they should be here instead of discord.ts
*/
const ZDiscordTag = z.object({
	id: z.string(),
	name: z.string(),
	moderated: z.boolean(),
	emoji_id: z.string().nullish(),
	emoji_name: z.string().nullish()
});
export const ZDiscordChannel = z.object({
	id: z.string(),
	type: z.number(),
	position: z.number().nullish(),
	name: z.string().nullish(),
	topic: z.string().nullish(),
	nsfw: z.boolean().nullish(),
	owner_id: z.string().nullish(),
	parentId: z.string().nullish(),
	flags: z.number().nullish(),
	available_tags: z.array(ZDiscordTag).nullish(),
	applied_tags: z.array(ZDiscordTag).nullish()
});
export type DiscordChannel = z.output<typeof ZDiscordChannel>;

const ZDiscordColours = z.object({
	primaryColor: z.number(),
	secondaryColor: z.number().nullish(),
	tertiaryColor: z.number().nullish()
});
export const ZDiscordRole = z.object({
	id: z.string(),
	name: z.string(),
	color: z.number(),
	colors: ZDiscordColours,
	hoist: z.boolean(),
	icon: z.string().nullish(),
	unicode_emoji: z.string().nullish(),
	permissions: z.string(),
	managed: z.boolean(),
	mentionable: z.boolean(),
	flags: z.number()
});
export type DiscordRole = z.output<typeof ZDiscordRole>;

export const ZDiscordUser = z.object({
	id: z.string(),
	accentColor: z.number().nullish(),
	avatar: z.string(),
	bot: z.boolean(),
	createdTimestamp: z.number(),
	defaultAvatarURL: z.string(),
	globalName: z.string().nullish(),
	hexAccentColor: z.string().nullish(),
	username: z.string()
});
export type DiscordUser = z.output<typeof ZDiscordUser>;

export const ZExpandedAuditLog = ZAuditLog.extend({
	executing_user: ZDiscordUser
});
export type ExpandedAuditLog = z.output<typeof ZExpandedAuditLog>;
