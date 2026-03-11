import { SqliteError } from 'better-sqlite3';

export type DatabaseError = SqliteError | Error;
