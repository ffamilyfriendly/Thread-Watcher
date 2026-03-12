import z from "zod";
import {
  DISCORD_CHANNEL_NAME_MAX_LEN,
  DISCORD_MAX_CHARS_IN_PLACEHOLDER,
  DISCORD_MAX_FIELDS_IN_EMBED,
  DISCORD_MAX_TEXT_INPUT_LEN,
  DISCORD_MODAL_DESCRIPTION_MAX,
  DISCORD_MODAL_LABEL_MAX,
  DISCORD_SNOWFLAKE_MAX_LEN,
  TW_AI_PERSONA_MAX_LEN,
  TW_AI_RULES_MAX_LEN,
  TW_MAX_ALLOWED_CONDITIONS,
  TW_MAX_CHARS_IN_OPERANT_VALUE,
} from "./constants";
import { ZEmbed, ZStringSelectionOption } from "./discord";

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
  private_thread: z.boolean().default(true),
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
    .default(() => crypto.randomUUID()), // Not the most user friendly standard option but it will do for now
  required: z.boolean().default(true),
});

export const ZModalBaseSelect = ZModalComponentBase.extend({
  placeholder: z
    .string()
    .max(DISCORD_MAX_CHARS_IN_PLACEHOLDER)
    .default("Select a value"),
  min_values: z.number().min(0).max(25).default(1),
  max_values: z.number().min(1).max(25).default(1),
});
export type BaseSelect = z.output<typeof ZModalBaseSelect>;

export const ZModalStringSelect = ZModalBaseSelect.extend({
  options: z
    .array(ZStringSelectionOption)
    .max(DISCORD_MAX_FIELDS_IN_EMBED)
    .default([]),
  type: z.literal("STRING_SELECT").default("STRING_SELECT"),
});

export const ZModalUserSelect = ZModalBaseSelect.extend({
  type: z.literal("USER_SELECT").default("USER_SELECT"),
});
export const ZModalRoleSelect = ZModalBaseSelect.extend({
  type: z.literal("ROLE_SELECT").default("ROLE_SELECT"),
});
export const ZModalChannelSelect = ZModalBaseSelect.extend({
  channel_types: z.array(z.number()).max(17).nullish(),
  type: z.literal("CHANNEL_SELECT").default("CHANNEL_SELECT"),
});
export const ZModalFileUpload = ZModalComponentBase.extend({
  min_values: z.number().min(0).max(10).default(1),
  max_values: z.number().max(10).default(1),
  type: z.literal("FILE_UPLOAD").default("FILE_UPLOAD"),
});

export const ZModalTextInput = ZModalComponentBase.extend({
  // The reason for these being named 'min_values' and 'max_values' is so we can use the same Wrapper on the frontend
  // for configuring these 2 values
  min_values: z.number().min(0).max(4000).default(0),
  max_values: z.number().min(1).max(DISCORD_MAX_TEXT_INPUT_LEN).default(4000),
  value: z.string().max(400).nullish(),
  placeholder: z.string().max(DISCORD_MAX_CHARS_IN_PLACEHOLDER).nullish(),
  type: z.literal("TEXT_INPUT").default("TEXT_INPUT"),
});

export const ZModalComponent = z.discriminatedUnion("type", [
  ZModalTextInput,
  ZModalFileUpload,
  ZModalChannelSelect,
  ZModalRoleSelect,
  ZModalUserSelect,
  ZModalStringSelect,
]);
export type ModalComponent = z.output<typeof ZModalComponent>;

export type TypedComponent<T extends ModalComponent["type"]> = Extract<
  ModalComponent,
  { type: T }
>;

export const ZModalLabelComponent = z.object({
  uid: z.string().default(() => crypto.randomUUID()), // This is mostly for frontend ease
  label: z.string().min(3).max(DISCORD_MODAL_LABEL_MAX).default("Label Name"),
  description: z.string().max(DISCORD_MODAL_DESCRIPTION_MAX).nullish(),
  component: ZModalComponent,
});

export const DISCORD_MAX_LABELS_IN_MODAL = 5;
export const ZQuestionModal = ZModule.extend({
  title: z.string().max(45).default("Details"),
  labels: z
    .array(ZModalLabelComponent)
    .max(DISCORD_MAX_LABELS_IN_MODAL)
    .default([]),
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
