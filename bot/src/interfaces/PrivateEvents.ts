import { TYPED_EVENTS } from '#/events/IPC/shared/typed_events';
import { Result } from 'neverthrow';
import z from 'zod';

export interface BaseEvent {
  request_id: string;
  type: string;
  data: unknown | null;
}

export interface ReponseEvent extends BaseEvent {
  ok: boolean;
}

export interface PrivateInteraction {
  reply: (status: boolean, data: unknown) => void;
}

export type CallbackResponse<TOK = unknown> = Result<TOK, unknown>;
export type Callback<T, TOUT = unknown> = (
  arg0: T,
) => CallbackResponse<TOUT> | Promise<CallbackResponse<TOUT>>;

export interface PrivateEvent<T = unknown> {
  event_name: string;
  event_callback: Callback<T>;
}

export interface SecurePrivateEvent<K extends keyof typeof TYPED_EVENTS> {
  event_name: K;
  event_callback: Callback<
    z.output<(typeof TYPED_EVENTS)[K]['expected_data']>,
    z.output<(typeof TYPED_EVENTS)[K]['return_schema']>
  >;
}
