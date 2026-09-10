#!/usr/bin/env node
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDbPool } from '../lib/db';

const pool = getDbPool();

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const migrationsDir = join(projectRoot, 'db', 'migrations');

async function runMigrations() {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  console.log(`Running ${files.length} migration(s)...`);
  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    console.log(`  Applying ${file}...`);
    await pool.query(sql);
  }
  console.log('Migrations complete.');
}

async function runSeed() {
  const seedPath = join(projectRoot, 'db', 'seed.sql');
  const sql = readFileSync(seedPath, 'utf-8');
  console.log('Running seed...');
  await pool.query(sql);
  console.log('Seed complete.');
}

async function main() {
  const command = process.argv[2];
  try {
    if (command === 'migrate') {
      await runMigrations();
    } else if (command === 'seed') {
      await runSeed();
    } else if (command === 'setup') {
      await runMigrations();
      await runSeed();
    } else {
      console.log('Usage: node scripts/db.js [migrate|seed|setup]');
      process.exit(1);
    }
  } catch (err) {
    console.error('Database setup error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
