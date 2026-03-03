import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/database/sqlite/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: 'data.db',
  },
});
