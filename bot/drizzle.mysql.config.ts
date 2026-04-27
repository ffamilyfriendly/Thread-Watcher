import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/database/mysql/schema.ts',
  out: './drizzle/mysql',
  dialect: 'mysql',
  dbCredentials: {
    host: 'localhost',
    user: 'threadwatcher',
    password: 'dab420',
    database: 'threadwatcher',
  },
});
