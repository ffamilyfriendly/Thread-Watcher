import z from "zod";

export type SettingType = "number" | "string" | "boolean" | "channel" | "role";

export interface SettingDefinition<T extends z.ZodType> {
  key: string;
  name: string;
  description: string;
  type: SettingType;
  schema: T;
  default: z.output<T> | null;
  // for string selects — defines valid options the frontend can render
  options?: { label: string; value: string; description?: string }[];
}

const LOGGING_CHANNEL = {
  key: "LOGGING_CHANNEL",
  name: "Logging Channel",
  description: "The channel where audit logs will be sent",
  type: "channel" as const,
  schema: z.string(),
  default: null,
} satisfies SettingDefinition<z.ZodString>;

const BUMP_BEHAVIOUR = {
  key: "BUMP_BEHAVIOUR",
  name: "Bump Behaviour",
  description: "Controls how the bot keeps threads active",
  type: "string" as const,
  schema: z.enum(["BUMP_AND_UNARCHIVE", "UNARCHIVE_ONLY"]),
  default: "BUMP_AND_UNARCHIVE",
  options: [
    {
      label: "Bump and Un-Archive",
      value: "BUMP_AND_UNARCHIVE",
      description: "Keep thread un-archived and active",
    },
    {
      label: "Un-Archive Only",
      value: "UNARCHIVE_ONLY",
      description: "Only un-archive the thread",
    },
  ],
};

const BOT_MASTER_ROLE = {
  key: "BOT_MASTER_ROLE",
  name: "Bot Master Role",
  description: "The role which grants access to the Thread-Watcher dashboard",
  type: "role" as const,
  schema: z.string(),
  default: null,
};

const NEEDLE_INTEGRATION = {
  key: "NEEDLE_INTEGRATION",
  name: "Watch Needle Threads",
  description: `Will automatically watch any threads created with Needle!`,
  type: "boolean" as const,
  schema: z.preprocess((val) => {
    if (typeof val === "string") {
      if (val.toLowerCase() === "true") return true;
      if (val.toLowerCase() === "false") return false;
    }
    return val;
  }, z.boolean()),
  default: false,
};

const AUDIT_LOG_RETENTION = {
  key: "AUDIT_LOG_RETENTION",
  name: "Audit Log Retention",
  description: "How long to retain audit logs for your server",
  type: "string" as const,
  schema: z.enum(["86400", "2592000", "7776000"]),
  default: "86400",
  options: [
    { label: "24 Hours", value: "86400" },
    { label: "30 Days", value: "2592000" },
    { label: "90 Days", value: "7776000" },
  ],
};

export const SETTINGS = {
  LOGGING_CHANNEL,
  BUMP_BEHAVIOUR,
  BOT_MASTER_ROLE,
  AUDIT_LOG_RETENTION,
  NEEDLE_INTEGRATION,
} as const;

export type SettingKey = keyof typeof SETTINGS;
export type SettingOutput<K extends SettingKey> =
  (typeof SETTINGS)[K] extends SettingDefinition<infer T> ? z.output<T> : never;

export function is_setting_key(key: string): key is SettingKey {
  return key in SETTINGS;
}
