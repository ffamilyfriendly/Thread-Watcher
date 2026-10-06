import { fetch_channel_bot_context } from '#/events/IPC/shared/fetchers/channel_fetcher';
import { define_typed_event } from '../shared/typed_events';
export default define_typed_event('fetch_channel', fetch_channel_bot_context);
