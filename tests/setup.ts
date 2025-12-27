import { beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { rmSync, mkdirSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const TEST_DB_PATH = join(__dirname, '../data/test.db');

// Set test environment
process.env['NODE_ENV'] = 'test';
process.env['DB_PATH'] = TEST_DB_PATH;
process.env['JWT_SECRET'] = 'test-jwt-secret';
process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret';

export function createTestDatabase(): Database.Database {
  const db = new Database(TEST_DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      gender TEXT DEFAULT 'female' CHECK (gender IN ('female', 'male', 'neutral')),
      apple_id TEXT UNIQUE,
      google_id TEXT UNIQUE,
      avatar_url TEXT,
      push_token TEXT,
      push_enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_users_apple_id ON users(apple_id) WHERE apple_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);

  return db;
}

export function cleanupTestDatabase(): void {
  try {
    rmSync(TEST_DB_PATH, { force: true });
    rmSync(`${TEST_DB_PATH}-wal`, { force: true });
    rmSync(`${TEST_DB_PATH}-shm`, { force: true });
  } catch {
    // Ignore errors
  }
}

beforeAll(() => {
  mkdirSync(join(__dirname, '../data'), { recursive: true });
  cleanupTestDatabase();
});

afterAll(() => {
  cleanupTestDatabase();
});

beforeEach(() => {
  cleanupTestDatabase();
});
