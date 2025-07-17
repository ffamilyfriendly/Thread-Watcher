import { Database } from 'interfaces/Database';
import { ConfigType } from 'utilities/config';
import SqliteHandler from './sqlite';

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
