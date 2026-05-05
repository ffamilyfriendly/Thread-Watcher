import { ISettingsParam, Logger } from 'tslog';
import { create_singleton } from './singleton';
import { IS_DEVELOPMENT } from '#/CONSTANTS';

const singleton = create_singleton(
  () => {
    let conf: ISettingsParam<unknown> = {
      minLevel: 3,
      hideLogPositionForProduction: true,
      type: 'json',
    };

    if (IS_DEVELOPMENT) {
      conf = {
        ...conf,
        minLevel: 0,
        hideLogPositionForProduction: false,
        type: 'pretty',
      };
    }

    return new Logger(conf);
  },
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
