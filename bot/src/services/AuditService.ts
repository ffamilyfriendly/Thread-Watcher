import { logger } from '@providers/logger';
import { AuditData } from '@watcher/shared';
import { Database } from '#/interfaces/Database';
import { err, ok, Result } from 'neverthrow';
import { DatabaseError } from '#/utilities/error/def';

// Matches your ZAuditTypes literal values
export const AUDIT_TYPES_LIST = [
  'COMMAND',
  'CONFIG',
  'BATCH_ACTION',
  'THREAD_WATCHED',
  'THREAD_UNWATCHED',
  'MONITOR_ADD',
  'MONITOR_REMOVE',
] as const;

export type AuditType = (typeof AUDIT_TYPES_LIST)[number];

export type PartialAuditObject = Omit<AuditData, 'id' | 'timestamp'>;

export interface AuditMeta {
  executor_id: string;
  guild_id: string;
  reason?: string;
}

export default class AuditService {
  constructor(private db: Database) {}

  async log_event(meta: PartialAuditObject): Promise<Result<PartialAuditObject, DatabaseError>> {
    const insert_res = await this.db.insert_audit_log(meta);
    if (insert_res.isErr()) {
      logger.error('failed to insert audit log', insert_res.error);
      return err(insert_res.error);
    }
    return ok(meta);
  }

  async get_audit_logs(guild_id: string, page_size: number, before_id?: number) {
    return await this.db.get_audit_logs(guild_id, page_size, before_id);
  }
}
