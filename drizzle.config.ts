import { defineConfig } from 'drizzle-kit';

// Loads DATABASE_URL from the environment. Run db scripts with .env.local
// available, e.g. `env $(grep -v '^#' .env.local | xargs) npm run db:migrate`,
// or export DATABASE_URL inline. See src/db/README.md.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
