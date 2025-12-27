import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = process.env['DB_PATH'] || join(__dirname, '../../data/precious.db');

export const db: DatabaseType = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase(): void {
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
}

export function closeDatabase(): void {
  db.close();
}
