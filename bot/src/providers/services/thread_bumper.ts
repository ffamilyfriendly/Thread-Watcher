import { create_singleton } from '@providers/singleton';
import ThreadBumper from '#/services/ThreadBumper';

const singleton = create_singleton(() => new ThreadBumper());
export default singleton;
export const thread_bumper = singleton.instance;
