import { fetch_message_bot_context } from '#/events/IPC/shared/fetchers/message_fetcher';
import { define_typed_event } from '../shared/typed_events';
export default define_typed_event('fetch_message', fetch_message_bot_context);
