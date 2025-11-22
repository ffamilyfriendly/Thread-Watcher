import { AuditData, Database } from 'interfaces/Database';

export type AuditType =
  | 'THREAD_WATCHED'
  | 'THREAD_UNWATCHED'
  | 'CHANNEL_MONITOR_START'
  | 'CHANNEL_MONITOR_END'
  | 'CONFIG_UPDATE'
  | 'COMMAND_EXEC';
export default class AuditService {
  constructor(private db: Database) {}

  async log_event(
    type: AuditType,
    guild_id: string,
    executor_id: string,
    meta: Omit<AuditData, 'timestamp' | 'id' | 'guild_id' | 'executor_id'>,
  ) {
    const { reason, error, command_name, old_value, new_value, target_id } = meta;
    return this.db.insert_audit_log({
      audit_type: type,
      guild_id,
      executor_id,
      reason,
      error,
      command_name,
      old_value,
      new_value,
      target_id,
    });
  }
}
