import { load_module_as_and } from 'utilities/load_files';
import { create_singleton } from './singleton';
import { Module } from 'interfaces/Module';

function get_modules(bypass_cache = false) {
  let modules: Module[] = [];
  load_module_as_and<Module>(
    './src/modules',
    (mods) => {
      modules = mods;
    },
    bypass_cache,
  );

  return modules;
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
