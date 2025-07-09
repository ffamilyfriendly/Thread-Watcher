export interface BaseEvent {
  request_id: string;
  type: string;
  data: unknown | null;
}

export interface PrivateInteraction {
  reply: (status: boolean, data: unknown) => void;
}

export interface PrivateEvent<T = unknown> {
  event_name: string;
  event_callback: (data: T, interaction: PrivateInteraction) => void;
}
