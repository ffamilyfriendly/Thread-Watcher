// This is code meant to migrate data from the V2 data structures to the current data structures.
// This migration script makes a lot of assumptions that are likely not correct for you if you are self hosting

import get_database_instance from '#/database';
import { read_config } from '#/utilities/config';
import mysql from 'mysql2/promise';
import { migrate_fr } from './migration_scripts';
const config_res = read_config();

if (config_res.isErr()) {
  console.error('could not read config!', config_res.error);
  process.exit(1);
}

const config = config_res.value;

if (config.database.flavour !== 'mysql') {
  console.error('Migration script only supports MySql');
  process.exit(1);
}

export const v3_db = get_database_instance(config);

const v2_pool = mysql.createPool({
  host: config.database.host,
  user: config.database.user,
  password: config.database.password,
  database: 'TW_DUMP',
  connectionLimit: config.database.connection_limit,
});

export async function v2_query<T>(sql: string): Promise<T[]> {
  const [rows] = await v2_pool.query(sql);
  return rows as T[];
}

console.log("Let's migrate! :D");
migrate_fr();
