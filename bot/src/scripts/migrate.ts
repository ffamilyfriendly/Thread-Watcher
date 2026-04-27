import get_database_instance from '#/database';
import { read_config } from '#/utilities/config';
const config_res = read_config();

if (config_res.isErr()) {
  console.error('could not read config!', config_res.error);
  process.exit(1);
}

const config = config_res.value;

export const v3_db = get_database_instance(config);

v3_db.run_migration().then((r) => {
  if (r.isErr()) {
    console.error('migration failed', r.error);
    process.exit(1);
  }

  console.log('migration done!');
});
