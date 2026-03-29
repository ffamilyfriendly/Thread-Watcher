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

const BATCH_WINDOW = 2000;
interface EventBucket {
  events: AppEventMap['thread:watched' | 'thread:unwatched'][];
  timer: Timer | null;
}

export class InternalBus {
  private emitter = new EventEmitter();
  private on_emit_hook?: (key: AppEventKey, payload: AppEventMap[AppEventKey]) => void;
  private guild_buckets = new Map<string, EventBucket>();

  set_on_emit(hook: (key: AppEventKey, payload: AppEventMap[AppEventKey]) => void) {
    this.on_emit_hook = hook;
  }

  handle_batch(guild_id: string) {
    const bucket = this.guild_buckets.get(guild_id);
    if (!bucket) return;
    this.guild_buckets.delete(guild_id);

    const { events } = bucket;

    const is_mixed = !!events.find(
      (item, idx) => item.data.audit_type !== events[Math.max(idx - 1, 0)].data.audit_type,
    );

    const first_item = events.at(0);
    if (!first_item) {
      logger.info(`'first_item' was somehow null on handle_batch (InternalBus)`);
      return;
    }

    let action_type: AppEventMap['thread:batch_action']['data']['action'] =
      first_item.data.audit_type === 'THREAD_WATCHED' ? 'WATCH' : 'UNWATCH';
    if (is_mixed) action_type = 'TOGGLE';

    const event_data: AppEventMap['thread:batch_action'] = {
      ...first_item,
      data: {
        audit_type: 'BATCH_ACTION',
        action: action_type,
        target_channels: events.map((ev) => ev.data.thread_id),
      },
    };

    this.emitter.emit('thread:batch_action', event_data);
    this.on_emit_hook?.('thread:batch_action', event_data);
  }

  emit<K extends AppEventKey>(key: K, payload: AppEventMap[K]): void {
    // We're doing this to collect multiple watches or unwatches into one batch log.
    // This will save us hella ratelimits and not flood any users servers with logs
    if (key === 'thread:watched' || key === 'thread:unwatched') {
      let bucket = this.guild_buckets.get(payload.guild_id);
      if (!bucket) {
        bucket = { events: [], timer: null };
        this.guild_buckets.set(payload.guild_id, bucket);
      }

      bucket.events.push(payload as AppEventMap['thread:watched' | 'thread:unwatched']);
      if (bucket.timer) clearTimeout(bucket.timer);
      bucket.timer = setTimeout(() => this.handle_batch(payload.guild_id), BATCH_WINDOW);
      return;
    }

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
      this.emitter.once(key, handler);
    } catch (e) {
      logger.error(`Event handler failed for '${key}'`, e);
    }
  }

  off<K extends AppEventKey>(key: K, handler: (payload: AppEventMap[K]) => void): void {
    this.emitter.off(key, handler);
  }
}
