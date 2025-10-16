#!/usr/bin/env tsx
/**
 * PostgreSQL Migration Runner
 *
 * Runs SQL migration files from the migrations directory.
 * Usage: pnpm migrate <migration-file>
 * Example: pnpm migrate 002_add_image_url.sql
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const migrationFile = process.argv[2];

  if (!migrationFile) {
    console.error('❌ Error: Please provide a migration file');
    console.error('Usage: pnpm migrate <migration-file>');
    console.error('Example: pnpm migrate 002_add_image_url.sql');
    process.exit(1);
  }

  const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile);

  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Error: Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  // Create PostgreSQL connection pool
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'auctions_dev',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
  });

  try {
    console.log(`🔄 Running migration: ${migrationFile}`);
    console.log(`📁 File: ${migrationPath}`);
    console.log(`🗄️  Database: ${pool.options.database}@${pool.options.host}:${pool.options.port}`);
    console.log('');

    // Read migration file
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Execute migration
    await pool.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('');
  } catch (error) {
    console.error('❌ Migration failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
