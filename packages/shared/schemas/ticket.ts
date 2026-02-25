import z from "zod";

export const DISCORD_EMBED_TITLE_MAX_LEN = 256;
export const DISCORD_EMBED_DESCRIPTION_MAX_LEN = 4096;
export const DISCORD_MAX_FIELDS_IN_EMBED = 25;
export const DISCORD_MAX_CHARS_IN_FIELD_TITLE = 256;
export const DISCORD_MAX_CHARS_IN_FIELD_TEXT = 1024;

// Generic stuff used both in panel and pipeline
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
  title: z.string(),
  description: z.string().nullish(),
  option_id: z.string(),
});

export const ZButtonStart = z.object({
  type: z.literal("BUTTON"),
  button_text: z.string(),
});

export const ZSelectionStart = z.object({
  type: z.literal("SELECTION"),
  options: z.array(ZStringSelectionOption),
});

// Pipeline stuff
export const ConditionalOperands = [
  "starts_with",
  "ends_with",
  "includes",
  "not_null",
  "equal",
] as const;

export const ZConditional = z.object({
  value_1: z.string(),
  operand: z.enum(ConditionalOperands),
  value_2: z.string().nullish(),
});
export type Conditional = z.output<typeof ZConditional>;

export const ZModule = z.object({
  uid: z.string(), // internal Id that cannot be changed
  id: z.string(),
  conditional_type: z.enum(["AND", "OR"]),
  conditionals: z.array(ZConditional),
});

// This modules does not really exist. It's injected and includes variables such as the selected role and so forth
export const ZFakeEnvModule = ZModule.extend({
  type: z.literal("ROOT_ENV_MODULE"),
});

// Changes the assigned role of the ticket
export const ZAssignRole = ZModule.extend({
  role_id: z.string().nullish(),
  type: z.literal("ASSIGN_ROLE").default("ASSIGN_ROLE"),
});

// Changes the assigned role of the ticket
export const ZGenerateAnswer = ZModule.extend({
  prompt: z.string().nullish(),
  type: z.literal("GENERATE_ANSWER").default("GENERATE_ANSWER"),
});

export const ZPipelineModule = z.discriminatedUnion("type", [
  ZAssignRole,
  ZGenerateAnswer,
  ZFakeEnvModule,
]);
export type PipelineModule = z.output<typeof ZPipelineModule>;
export type TypedPipelineModule<T extends PipelineModule["type"]> = Extract<
  PipelineModule,
  { type: T }
>;
export type RenderableModule = TypedPipelineModule<
  Exclude<PipelineModule["type"], "ROOT_ENV_MODULE">
>;

export const ZPipeline = z.array(ZPipelineModule);
export type Pipeline = z.output<typeof ZPipeline>;

// Panel related stuff
export const ZTicketPanel = z.object({
  id: z.string(),
  name: z.string().nullish(),
  description: z.string().nullish(),
  should_watch_ticket: z.coerce.boolean(),
  should_GPT_summarize_ticket: z.coerce.boolean(),
  discord_message_id: z.string().nullish(), // The message ID of the panel. Used to edit updated panels / check if we've sent the panel message
  initial_assigned_role: z.string(), // The role that will be assigned to the ticket (if pipeline does not alter)
  initial_channel_id: z.string(), // The channel the ticket will open in (if pipeline does not alter)
  commencement_embed: ZEmbed,
  commencement_method: z.union([ZButtonStart, ZSelectionStart]),
  pipeline: ZPipeline,
});

export const ZTicket = z.object({
  id: z.string(),
  discord_channel_id: z.string(),
  owner: z.string(),
  panel_id: z.string(),
  status: z.enum(["OPEN", "CLOSED"]),
  assigned_to_role: z.string(),
  claimed_by_user_id: z.string().nullish(),
  created_at: z.coerce.date(),
  closed_at: z.coerce.date().nullish(),
});
export type TicketPanel = z.output<typeof ZTicketPanel>;
