import { load_module_as_and } from '#/utilities/load_files';
import { create_singleton } from './singleton';
import { Module } from '#/interfaces/Module';
import { logger } from './logger';

async function get_modules(bypass_cache = false): Promise<Module[]> {
  return new Promise((resolve) => {
    load_module_as_and<Module>(
      './src/modules',
      (mods) => {
        logger.silly(`Loaded Modules:`, mods.map((m) => m.name).join(', '));
        resolve(mods); // Now we resolve the promise with the data
      },
      bypass_cache,
    ).then((result) => {
      if (result.isErr()) {
        logger.error('Could not load Modules!', result.error);
      }
    });
  });
}

const singleton = create_singleton(
  () => get_modules(),
  (instance) => ({
    reload_modules: () => {
      instance = get_modules(true);
    },
  }),
);
export default singleton;
export const modules = singleton.instance;
