export interface Event<T = unknown> {
  event_name: string;
  event_callback: (data: T) => void;
}
