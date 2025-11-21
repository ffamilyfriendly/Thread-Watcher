export interface Event<T1 = unknown, T2 = unknown> {
  event_name: string;
  event_callback: (d1: T1, d2: T2) => void;
}
