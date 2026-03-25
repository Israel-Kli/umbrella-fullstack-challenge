import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

require('dotenv').config({ path: join(__dirname, '../.env') });

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const sql = readFileSync(join(__dirname, '../migrations/001_init.sql'), 'utf-8');
    console.log('Running migrations...');
    await pool.query(sql);
    console.log('✓ Migrations complete');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
