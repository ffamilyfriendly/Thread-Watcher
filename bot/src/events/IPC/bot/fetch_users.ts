import { fetch_users_bot_context } from '../shared/fetchers/user_fetcher';
import { define_typed_event } from '../shared/typed_events';

export default define_typed_event('fetch_users', fetch_users_bot_context);
