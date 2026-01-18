import z from "zod";

export const ZAuditData = z.object({
  id: z.number(),
  guild_id: z.string(),
  executor_id: z.string(),
  target_id: z.string().nullish(),
  old_value: z.string().nullish(),
  new_value: z.string().nullish(),
  reason: z.string().nullish(),
  error: z.string().nullish(),
  exec_time_ms: z.number().nullish(),
  command_name: z.string().nullish(),
  timestamp: z.coerce.date().transform((d) => d.getTime()),
  audit_type: z.string(),
});
export type AuditData = z.output<typeof ZAuditData>;
