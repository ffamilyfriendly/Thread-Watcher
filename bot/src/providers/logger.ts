import { Logger } from 'tslog';
import { create_singleton } from './singleton';

const singleton = create_singleton(
  () => new Logger({ minLevel: 3 }),
  (instance) => ({
    child: (name: string) => instance.getSubLogger({ name }),
    with_name: (name: string) => {
      instance.settings.name = name;
      return instance;
    },
  }),
);
export default singleton;
export const logger = singleton.instance;
