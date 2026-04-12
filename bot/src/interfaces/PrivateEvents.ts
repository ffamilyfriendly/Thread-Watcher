import { Result } from 'neverthrow';
import { FUNCS } from '#/utilities/ipc_clients';
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

export interface SecurePrivateEvent<K extends keyof typeof FUNCS> {
  event_name: K;
  event_callback: Callback<
    z.output<(typeof FUNCS)[K]['expected_data']>,
    z.output<(typeof FUNCS)[K]['return_schema']>
  >;
}

export function define_secure_event<K extends keyof typeof FUNCS>(
  event_name: K,
  callback: Callback<
    z.output<(typeof FUNCS)[K]['expected_data']>,
    z.output<(typeof FUNCS)[K]['return_schema']>
  >,
): SecurePrivateEvent<K> {
  return {
    event_name,
    event_callback: callback,
  };
}
