/**
 * Drizzle Kit Configuration
 *
 * Configuration for Drizzle Kit CLI tools (migrations, push, studio).
 * Used to generate SQL migrations from the TypeScript schema.
 *
 * @see https://orm.drizzle.team/kit-docs/config-reference
 */

import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'auctions_dev',
  },
} satisfies Config;
