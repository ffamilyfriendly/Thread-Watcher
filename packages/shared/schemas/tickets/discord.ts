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
