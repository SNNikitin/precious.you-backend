#!/usr/bin/env node
/**
 * Скрипт создания базы данных
 * Использование: npx tsx scripts/setup-db.ts [путь_к_бд]
 */

import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const dbPath = process.argv[2] || process.env['DB_PATH'] || './data/precious.db';

// Создаём директорию если нужно
mkdirSync(dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

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

console.log(`✓ Database created: ${dbPath}`);

db.close();
