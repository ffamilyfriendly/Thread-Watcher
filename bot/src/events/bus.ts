import { logger } from '@providers/logger';
import { AuditData, NarrowedLog } from '@watcher/shared';
import { EventEmitter } from 'events';

export type LogEventType<T extends AuditData['data']['audit_type']> = Omit<
  NarrowedLog<T>,
  'timestamp' | 'id'
>;

export interface AppEventMap {
  'monitor:created': LogEventType<'MONITOR_ADD'>;
  'monitor:deleted': LogEventType<'MONITOR_REMOVE'>;
  'thread:watched': LogEventType<'THREAD_WATCHED'>;
  'thread:unwatched': LogEventType<'THREAD_UNWATCHED'>;
  'thread:batch_action': LogEventType<'BATCH_ACTION'>;
  'config:change': LogEventType<'CONFIG'>;
  command: LogEventType<'COMMAND'>;
}

export type AppEventKey = keyof AppEventMap;

export class InternalBus {
  private emitter = new EventEmitter();
  private on_emit_hook?: (key: AppEventKey, payload: AppEventMap[AppEventKey]) => void;

  set_on_emit(hook: (key: AppEventKey, payload: AppEventMap[AppEventKey]) => void) {
    this.on_emit_hook = hook;
  }

  emit<K extends AppEventKey>(key: K, payload: AppEventMap[K]): void {
    this.emitter.emit(key, payload);
    this.on_emit_hook?.(key, payload);
  }

  on<K extends AppEventKey>(key: K, handler: (payload: AppEventMap[K]) => void): void {
    try {
      this.emitter.on(key, handler);
    } catch (e) {
      logger.error(`Event handler failed for '${key}'`, e);
    }
  }

  once<K extends AppEventKey>(key: K, handler: (payload: AppEventMap[K]) => void): void {
    try {
      this.emitter.on(key, handler);
    } catch (e) {
      logger.error(`Event handler failed for '${key}'`, e);
    }
  }

  off<K extends AppEventKey>(key: K, handler: (payload: AppEventMap[K]) => void): void {
    this.emitter.off(key, handler);
  }
}
