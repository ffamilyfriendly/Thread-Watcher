import { Database, DatabaseError } from 'interfaces/Database';
import { ConfigType } from 'utilities/config';
import SqliteHandler from './sqlite/adapter';
import { err, ok, Result } from 'neverthrow';
import { SQLiteError } from 'bun:sqlite';
import z from 'zod';

export default function get_database_instance(config: ConfigType): Database {
  let handler_type;
  switch (config.database.flavour) {
    case 'sqlite':
      handler_type = SqliteHandler;
      break;
    default:
      throw new Error('oopsie poopsie');
  }

  return new handler_type(config);
}

function handle_error(err_data: unknown) {
  if (err_data instanceof SQLiteError || err_data instanceof Error) {
    return err(err_data);
  } else {
    // Tenary operators get VERY beutiful with ts type checking
    // You, the reader, is most welcome. I wrote this shit at 21:00 2025-07-17 btw fun fact!!! :D :D :D
    // > Thank you, past me, for this nice message. I wrote this reply at 01:58 2025-11-22
    const message =
      err_data &&
      typeof err_data === 'object' &&
      'message' in err_data &&
      typeof err_data.message === 'string'
        ? err_data.message
        : 'unknown error idk bro';

    const unknown_error = new Error(message);

    return err(unknown_error);
  }
}

export function with_error_handling<T extends (...args: any[]) => any>(
  _target: any,
  _property_key: string,
  descriptor: TypedPropertyDescriptor<T>,
) {
  const original_method = descriptor.value!;

  descriptor.value = async function (
    this: any,
    ...args: any[]
  ): Promise<Result<any, DatabaseError>> {
    try {
      const result = await original_method.apply(this, args);

      if (result && typeof result == 'object' && 'isOk' in result) {
        return result;
      }

      return ok(result);
    } catch (err_data) {
      return handle_error(err_data);
    }
  } as T;

  return descriptor;
}

type obj = { [k: string]: any };
export function clean_keys<T extends Object>(obj: obj): Partial<obj> {
  return Object.fromEntries(Object.entries(obj).filter(([_, value]) => value !== undefined));
}

export function with_schema<T>(data: unknown, schema: z.ZodType<T>): Result<T, z.ZodError<T>> {
  const parsed = schema.safeParse(data);
  if (parsed.success) return ok(parsed.data);

  return err(parsed.error);
}
