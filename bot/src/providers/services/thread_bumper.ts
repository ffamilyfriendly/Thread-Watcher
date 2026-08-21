import { create_singleton } from '@providers/singleton';
import ThreadBumper from '#/services/ThreadBumper';
import { redis } from '@providers/redis';

const singleton = create_singleton(() => new ThreadBumper(redis));
export default singleton;
export const thread_bumper = singleton.instance;
