import { read_config } from 'utilities/config';
import logger from './logger';
import { create_singleton } from './singleton';

const singleton = create_singleton(() => {
  const config_res = read_config();
  if (config_res.isErr()) {
    logger.instance.error('Could not load config', config_res.error);
    process.exit(1);
  }
  return config_res.value;
});
export default singleton;
export const config = singleton.instance;
