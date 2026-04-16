import z from "zod";
import {
  DISCORD_EMBED_DESCRIPTION_MAX_LEN,
  DISCORD_EMBED_TITLE_MAX_LEN,
  DISCORD_MAX_CHARS_IN_BUTTON_LABEL,
  DISCORD_MAX_CHARS_IN_FIELD_TEXT,
  DISCORD_MAX_CHARS_IN_FIELD_TITLE,
  DISCORD_MAX_CHARS_IN_OPTION,
  DISCORD_MAX_CHARS_IN_PLACEHOLDER,
  DISCORD_MAX_FIELDS_IN_EMBED,
} from "./constants";

export const ZEmbedField = z.object({
  title: z.string().max(DISCORD_MAX_CHARS_IN_FIELD_TITLE),
  text: z.string().max(DISCORD_MAX_CHARS_IN_FIELD_TEXT),
  is_inline: z.boolean().nullish(),
});

export const ZEmbed = z.object({
  title: z.string().max(DISCORD_EMBED_TITLE_MAX_LEN),
  description: z.string().max(DISCORD_EMBED_DESCRIPTION_MAX_LEN).nullish(),
  fields: z.array(ZEmbedField).max(DISCORD_MAX_FIELDS_IN_EMBED),
  colour: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, { error: "Must be valid colour hex" }),
});
export type EmbedField = z.output<typeof ZEmbedField>;
export type Embed = z.output<typeof ZEmbed>;

export const ZStringSelectionOption = z.object({
  title: z.string().max(DISCORD_MAX_CHARS_IN_OPTION),
  description: z.string().max(DISCORD_MAX_CHARS_IN_OPTION).nullish(),
  option_id: z.string().max(DISCORD_MAX_CHARS_IN_OPTION),
});
export type StringSelectOption = z.output<typeof ZStringSelectionOption>;

export const ZButtonStart = z.object({
  type: z.literal("BUTTON"),
  button_text: z.string().max(DISCORD_MAX_CHARS_IN_BUTTON_LABEL),
});
export type ButtonStart = z.output<typeof ZButtonStart>;

export const ZSelectionStart = z.object({
  type: z.literal("SELECTION"),
  placeholder: z.string().max(DISCORD_MAX_CHARS_IN_PLACEHOLDER),
  options: z.array(ZStringSelectionOption).max(DISCORD_MAX_FIELDS_IN_EMBED),
});
export type SelectionStart = z.output<typeof ZSelectionStart>;

export const ZNativeDiscordEmbedField = z.object({
  inline: z.boolean().optional(),
  name: z.string(),
  value: z.string(),
});

export const ZNativeDiscordEmbedFooter = z.object({
  iconURL: z.string().optional(),
  proxyIconURL: z.string().optional(),
  text: z.string(),
});

export const ZNativeDiscordEmbedAuthor = z.object({
  iconURL: z.string().optional(),
  name: z.string(),
  proxyIconURL: z.string().optional(),
  url: z.string().optional(),
});

export const ZNativeDiscordEmbedMedia = z.object({
  height: z.number().optional(),
  proxyURL: z.string().optional(),
  url: z.string().optional(),
  width: z.number().optional(),
});

export const ZNativeDiscordEmbed = z.object({
  title: z.string().nullish(),
  description: z.string().nullish(),
  hexColor: z.string().nullish(),
  fields: z.array(ZNativeDiscordEmbedField).default([]),
  footer: ZNativeDiscordEmbedFooter.nullish(),
  author: ZNativeDiscordEmbedAuthor.nullish(),
  thumbnail: ZNativeDiscordEmbedMedia.nullish(),
  timestamp: z.string().nullish(),
  url: z.string().nullish(),
  video: ZNativeDiscordEmbedMedia.nullish(),
});
export type NativeDiscordEmbed = z.output<typeof ZNativeDiscordEmbed>;

export const ZDiscordUser = z.object({
  id: z.string(),
  accentColor: z.number().nullish(),
  avatar: z.string().nullish(),
  bot: z.boolean(),
  createdTimestamp: z.number(),
  defaultAvatarURL: z.string(),
  globalName: z.string().nullish(),
  hexAccentColor: z.string().nullish(),
  username: z.string(),
});
export type DiscordUser = z.output<typeof ZDiscordUser>;

// Stuff moved over from web internal_api.ts

const ZDiscordColours = z.object({
  primaryColor: z.number(),
  secondaryColor: z.number().nullish(),
  tertiaryColor: z.number().nullish(),
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
  flags: z.number(),
});
export type DiscordRole = z.output<typeof ZDiscordRole>;

const ZDiscordTag = z.object({
  id: z.string(),
  name: z.string(),
  moderated: z.boolean(),
  emoji: z
    .object({ id: z.string().nullish(), name: z.string().nullish() })
    .nullish(),
});

export type DiscordTag = z.output<typeof ZDiscordTag>;

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
  availableTags: z.array(ZDiscordTag).nullish(),
  appliedTags: z.array(z.string()).nullish(),
});
export type DiscordChannel = z.output<typeof ZDiscordChannel>;

export const ZDJSGuild = z.object({
  banner: z.string().nullish(),
  description: z.string().nullish(),
  icon: z.string().nullish(),
  id: z.string(),
  large: z.boolean(),
  memberCount: z.number(),
  name: z.string(),
  nameAcronym: z.string(),
  ownerId: z.string(),
});
export type DJSGuild = z.output<typeof ZDJSGuild>;
