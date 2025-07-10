import { readdirSync, statSync } from 'fs';
import { join as join_path, extname, isAbsolute } from 'path';
import { Err, Result, ResultAsync, err, ok } from 'neverthrow';

interface FileOptions {
  file_extention: string | string[];
}

export function get_file_paths(path: string, options?: FileOptions): string[] {
  const paths_arr = [];

  if (!isAbsolute(path)) {
    path = join_path(process.cwd(), path);
  }

  for (const file of readdirSync(path)) {
    const file_path = join_path(path, file);
    const info = statSync(file_path);

    if (info.isDirectory()) {
      paths_arr.push(...get_file_paths(file_path, options));
    } else {
      if (options?.file_extention) {
        const allowed_extentions = Array.isArray(options.file_extention)
          ? options.file_extention
          : [options.file_extention];

        const file_extention = extname(file).toLowerCase().substring(1);
        if (!allowed_extentions.includes(file_extention)) continue;
      }
      paths_arr.push(file_path);
    }
  }

  return paths_arr;
}

// Really catchy name huh? Thread-Watcher V3 is gonna be lit 💀🔥
export async function load_paths_as_modules<T>(
  paths: string[],
  bypass_cache = false,
): Promise<Result<T[], { error: unknown; message: string }>> {
  const modules_loaded: T[] = [];

  for (let path of paths) {
    if (bypass_cache) path += `?date=${Date.now()}`;

    const module_import = await ResultAsync.fromPromise(import(path), (error) => ({
      error,
      message: `could not import module at path: ${path}`,
    }));

    if (module_import.isErr()) {
      return err(module_import.error);
    }

    if (!('default' in module_import.value)) {
      return err({
        error: new Error('Default export missing'),
        message: `File at path ${path} does not export a default value`,
      });
    }

    const as_module = module_import.value.default as T;
    modules_loaded.push(as_module);
  }

  return ok(modules_loaded);
}

export async function load_module_as_and<T>(
  directory: string,
  callback: (modules: T[]) => void,
  bypass_cache = false,
): Promise<Result<void, unknown>> {
  const event_paths = get_file_paths(directory, { file_extention: 'ts' });
  const event_modules_result = await load_paths_as_modules<T>(event_paths, bypass_cache);

  if (event_modules_result.isErr()) {
    return err(event_modules_result.error);
  } else {
    const event_modules = event_modules_result.value;
    callback(event_modules);
    return ok();
  }
}
