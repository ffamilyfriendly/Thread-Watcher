import { Result } from 'neverthrow';

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

export type CallbackResponse = Result<unknown, unknown>;
export type Callback<T> = (arg0: T) => CallbackResponse | Promise<CallbackResponse>;

export interface PrivateEvent<T = unknown> {
  event_name: string;
  event_callback: Callback<T>;
}
