import { thread_bumper } from 'bot';
const CHECK_STALE_INTERVAL_MINUTES = 2;

export function start_bumper_loop() {
  thread_bumper.bump_stale();
  setInterval(() => thread_bumper.bump_stale(), CHECK_STALE_INTERVAL_MINUTES * 60 * 1000);
}
