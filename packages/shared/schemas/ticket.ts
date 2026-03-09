import z from "zod";

// Discord related constraints
export const DISCORD_EMBED_TITLE_MAX_LEN = 256;
export const DISCORD_EMBED_DESCRIPTION_MAX_LEN = 4096;
export const DISCORD_MAX_FIELDS_IN_EMBED = 25;
export const DISCORD_MAX_CHARS_IN_FIELD_TITLE = 256;
export const DISCORD_MAX_CHARS_IN_FIELD_TEXT = 1024;
export const DISCORD_MAX_CHARS_IN_PLACEHOLDER = 150;
export const DISCORD_MAX_CHARS_IN_BUTTON_LABEL = 80;
export const DISCORD_MAX_CHARS_IN_OPTION = 100; // Value is the same for id, label, and description
export const DISCORD_SNOWFLAKE_MAX_LEN = 19;
export const DISCORD_CHANNEL_NAME_MAX_LEN = 100;
export const DISCORD_MODAL_LABEL_MAX = 45;
export const DISCORD_MODAL_DESCRIPTION_MAX = 100;

// Service restraints
export const TW_MAX_CHARS_IN_OPERANT_VALUE = 100;
export const TW_MAX_ALLOWED_CONDITIONS = 10;
export const TW_AI_PERSONA_MAX_LEN = 500;
export const TW_AI_RULES_MAX_LEN = 2500;

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

// Pipeline stuff
export const ConditionalOperands = [
  "starts_with",
  "ends_with",
  "includes",
  "not_null",
  "equal",
] as const;

export const ZConditional = z.object({
  value_1: z.string().max(TW_MAX_CHARS_IN_OPERANT_VALUE),
  operand: z.enum(ConditionalOperands),
  value_2: z.string().max(TW_MAX_CHARS_IN_OPERANT_VALUE).nullish(),
});
export type Conditional = z.output<typeof ZConditional>;

export const ZModule = z.object({
  uid: z.string().max(TW_MAX_CHARS_IN_OPERANT_VALUE), // internal Id that cannot be changed
  id: z.string().max(TW_MAX_CHARS_IN_OPERANT_VALUE),
  conditional_type: z.enum(["AND", "OR"]),
  conditionals: z.array(ZConditional).max(TW_MAX_ALLOWED_CONDITIONS),
});
export type BaseModule = z.output<typeof ZModule>;

// This modules does not really exist. It's injected and includes variables such as the selected role and so forth
export const ZFakeEnvModule = ZModule.extend({
  type: z.literal("ROOT_ENV_MODULE"),
});

// Changes the assigned role of the ticket
export const ZAssignRole = ZModule.extend({
  role_id: z.string().max(DISCORD_SNOWFLAKE_MAX_LEN).nullish(),
  append: z.boolean().default(false), // true = add the role to the already existing selected roles
  type: z.literal("ASSIGN_ROLE").default("ASSIGN_ROLE"),
});

// Changes the assigned channel of the ticket
export const ZAssignChannel = ZModule.extend({
  channel_id: z.string().max(DISCORD_SNOWFLAKE_MAX_LEN).nullish(),
  type: z.literal("ASSIGN_CHANNEL").default("ASSIGN_CHANNEL"),
});

// Changes the assigned name of the ticket
export const ZAssignName = ZModule.extend({
  new_name: z
    .string()
    .max(DISCORD_CHANNEL_NAME_MAX_LEN)
    .default("Ticket-{{env.number}}")
    .nullish(),
  type: z.literal("ASSIGN_NAME").default("ASSIGN_NAME"),
});

// Changes the assigned role of the ticket
export const ZAIIssueNarrower = ZModule.extend({
  persona: z
    .string()
    .max(TW_AI_PERSONA_MAX_LEN)
    .default("A helpful support assistant"),
  rules: z
    .string()
    .max(TW_AI_RULES_MAX_LEN)
    .default(
      "If the user is reporting someone make sure the user ID is present",
    ),
  type: z.literal("NARROW_ISSUE").default("NARROW_ISSUE"),
  max_responses: z.number().min(0).max(10).default(3),
});

export const ZOpenTicket = ZModule.extend({
  embed: ZEmbed.default({
    title: "Ticket Opened",
    fields: [],
    description: "Thank you for opening the ticket <@{{env.user.id}}>",
    colour: "#420677",
  }),
  type: z.literal("OPEN_TICKET").default("OPEN_TICKET"),
});

export const ZSilentlyResolve = ZModule.extend({
  embed: ZEmbed.default({
    title: "Answer",
    fields: [],
    description: "Provide an answer here",
    colour: "#77066e",
  }),
  type: z.literal("SILENT_RESOLVE").default("SILENT_RESOLVE"),
});

export const ZModalComponentBase = z.object({
  custom_id: z // We do not need to worry about the custom IDs colliding as this is "namespaced" to only the modal
    .string()
    .min(1)
    .max(100)
    .default(() => crypto.randomUUID()),
  required: z.boolean().default(true),
});

export const ZModalBaseSelect = ZModalComponentBase.extend({
  placeholder: z.string().max(DISCORD_MAX_CHARS_IN_PLACEHOLDER).nullish(),
  min_values: z.number().min(0).max(25).default(1),
  max_values: z.number().max(25).default(1),
});

export const ZModalStringSelect = ZModalBaseSelect.extend({
  placeholder: z.string().max(DISCORD_MAX_CHARS_IN_PLACEHOLDER).nullish(),
  options: z.array(ZStringSelectionOption).max(DISCORD_MAX_FIELDS_IN_EMBED),
  type: z.literal("STRING_SELECT").default("STRING_SELECT"),
});

export const ZModalUserSelect = ZModalBaseSelect.extend({
  type: z.literal("USER_SELECT").default("USER_SELECT"),
});
export const ZModalRoleSelect = ZModalBaseSelect.extend({
  type: z.literal("ROLE_SELECT").default("ROLE_SELECT"),
});
export const ZModalMentionableSelect = ZModalBaseSelect.extend({
  type: z.literal("MENTIONABLE_SELECT").default("MENTIONABLE_SELECT"),
});
export const ZModalChannelSelect = ZModalBaseSelect.extend({
  channel_types: z.array(z.number()).max(17).nullish(),
  type: z.literal("CHANNEL_SELECT").default("CHANNEL_SELECT"),
});
export const ZFileUpload = ZModalComponentBase.extend({
  min_values: z.number().min(0).max(10).default(1),
  max_values: z.number().max(10).default(1),
  type: z.literal("FILE_UPLOAD").default("FILE_UPLOAD"),
});

export const ZModalTextInput = ZModalComponentBase.extend({
  min_length: z.number().min(0).max(4000).default(0),
  max_length: z.number().min(1).max(4000).default(4000),
  value: z.string().max(400).nullish(),
  placeholder: z.string().max(DISCORD_MAX_CHARS_IN_PLACEHOLDER).nullish(),
  type: z.literal("TEXT_INPUT").default("TEXT_INPUT"),
});

export const ZModalComponent = z.discriminatedUnion("type", [
  ZModalTextInput,
  ZFileUpload,
  ZModalChannelSelect,
  ZModalMentionableSelect,
  ZModalRoleSelect,
  ZModalUserSelect,
  ZModalStringSelect,
]);

export const ZModalLabelComponent = z.object({
  label: z.string().min(3).max(DISCORD_MODAL_LABEL_MAX).default("Label Name"),
  description: z.string().max(DISCORD_MODAL_DESCRIPTION_MAX).nullish(),
  component: ZModalComponent,
});

export const ZQuestionModal = ZModule.extend({
  title: z.string().max(45).default("Details"),
  labels: z.array(ZModalLabelComponent).max(5).default([]),
  type: z.literal("MODAL_QUESTION").default("MODAL_QUESTION"),
});
export type QuestionModal = z.output<typeof ZQuestionModal>;

export const ZPipelineModule = z.discriminatedUnion("type", [
  ZAssignRole,
  ZAIIssueNarrower,
  ZFakeEnvModule,
  ZAssignChannel,
  ZAssignName,
  ZOpenTicket,
  ZSilentlyResolve,
  ZQuestionModal,
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
  panel_id: z.string(),
  guild_id: z.string(),
  name: z.string().nullish(),
  description: z.string().nullish(),
  should_watch_ticket: z.coerce.boolean(),
  should_GPT_summarize_ticket: z.coerce.boolean(),
  discord_message_id: z.string().nullish(), // The message ID of the panel. Used to edit updated panels / check if we've sent the panel message
  initial_assigned_roles: z.array(z.string()), // The roles that will be assigned to the ticket (if pipeline does not alter)
  initial_channel_id: z.string(), // The channel the ticket will open in (if pipeline does not alter)
  commencement_embed: ZEmbed,
  commencement_method: z.union([ZButtonStart, ZSelectionStart]),
  resolved_embed: ZEmbed,
  pipeline: ZPipeline,
});

export const ZEditTicketPanel = ZTicketPanel.partial();

export const ZTicket = z.object({
  id: z.string(),
  discord_channel_id: z.string(),
  name: z.string(),
  owner: z.string(),
  panel_id: z.string(),
  status: z.enum(["OPEN", "CLOSED"]),
  assigned_to_roles: z.array(z.string()),
  claimed_by_user_id: z.string().nullish(),
  created_at: z.coerce.date(),
  closed_at: z.coerce.date().nullish(),
});
export type TicketPanel = z.output<typeof ZTicketPanel>;
export type EditTicketPanel = z.output<typeof ZEditTicketPanel>;
export type TicketPanelMeta = Omit<TicketPanel, "id">;

export const DEFAULT_TICKET_PANEL: (s: string) => TicketPanel = (
  guild_id: string,
) => ({
  panel_id: "",
  guild_id,
  description: "",
  should_watch_ticket: true,
  should_GPT_summarize_ticket: true,
  initial_assigned_roles: [],
  initial_channel_id: "",
  commencement_embed: {
    title: "Open Ticket",
    colour: "#1c2d69",
    fields: [],
  },
  resolved_embed: {
    title: "Ticket Closed",
    colour: "#211a2e",
    fields: [],
  },
  pipeline: [],
  commencement_method: {
    type: "BUTTON",
    button_text: "open ticket",
  },
});
