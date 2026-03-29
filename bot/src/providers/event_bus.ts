import { create_singleton } from './singleton';
import { InternalBus } from 'events/bus';

const singleton = create_singleton(() => new InternalBus());
export default singleton;
export const event_bus = singleton.instance;
