import z from "zod";
import { ZFilterData } from "./monitor";

/*
CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY AUTOINCREMENT, error TEXT, command_name TEXT, exec_time_ms INTEGER, audit_type TEXT NOT NULL, guild_id TEXT NOT NULL, executor_id TEXT NOT NULL, target_id TEXT, old_value TEXT, new_value TEXT, reason TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)
*/

/*
CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY AUTOINCREMENT, audit_type TEXT NOT NULL, guild_id TEXT NOT NULL, executor_id TEXT NOT NULL, data TEXT NOT NULL, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)
*/

const ZAuditTypes = z.discriminatedUnion("audit_type", [
  z.object({
    audit_type: z.literal("COMMAND"),
    command_name: z.string(),
    command_args: z.record(z.string(), z.unknown()),
    error: z.string().nullish(),
  }),
  z.object({
    audit_type: z.literal("CONFIG"),
    old_value: z
      .union([z.string(), z.number(), z.boolean(), z.array(z.string())])
      .nullish(),
    new_value: z
      .union([z.string(), z.number(), z.boolean(), z.array(z.string())])
      .nullish(),
    setting_key: z.string(),
  }),
  z.object({
    audit_type: z.literal("BATCH_ACTION"),
    action: z.enum(["WATCH", "UNWATCH", "TOGGLE"]),
    target_channels: z.array(z.string()),
  }),
  z.object({
    audit_type: z.literal("THREAD_WATCHED"),
    thread_id: z.string(),
    due_to_monitor: z.string().nullable(),
  }),
  z.object({
    audit_type: z.literal("THREAD_UNWATCHED"),
    thread_id: z.string(),
    due_to_monitor: z.string().nullable(),
  }),
  z.object({
    audit_type: z.literal("MONITOR_ADD"),
    target_channel: z.string(),
    filters: ZFilterData.nullish(),
  }),
  z.object({
    audit_type: z.literal("MONITOR_REMOVE"),
    target_channel: z.string(),
  }),
]);

export const ZAuditData = z.object({
  id: z.number(),
  guild_id: z.string(),
  executor_id: z.string(),
  reason: z.string().nullish(),
  timestamp: z.coerce.date().transform((d) => d.getTime()),
  data: z.preprocess((val) => {
    if (typeof val === "string") {
      // We dont have neverthrow here :(
      try {
        return JSON.parse(val);
      } catch (e) {
        console.error("[PARSING] could not parse AuditData", e);
        return {};
      }
    }

    return val;
  }, ZAuditTypes),
});

export type NarrowedLog<
  T extends AuditData["data"]["audit_type"],
  BaseType = AuditData,
> = BaseType & { data: Extract<AuditData["data"], { audit_type: T }> };

export type AuditData = z.output<typeof ZAuditData>;
