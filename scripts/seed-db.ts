#!/usr/bin/env node
/**
 * Скрипт сида тестовых данных
 * Использование: npx tsx scripts/seed-db.ts [путь_к_бд]
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';

const dbPath = process.argv[2] || process.env['DB_PATH'] || './data/precious.db';

const db = new Database(dbPath);

const now = new Date().toISOString();

// Тестовые пользователи
const users = [
  {
    id: randomUUID(),
    email: 'alice@example.com',
    display_name: 'Alice',
    gender: 'female',
    apple_id: 'apple-alice-001',
    google_id: null,
  },
  {
    id: randomUUID(),
    email: 'bob@example.com',
    display_name: 'Bob',
    gender: 'male',
    apple_id: null,
    google_id: 'google-bob-001',
  },
  {
    id: randomUUID(),
    email: 'charlie@example.com',
    display_name: 'Charlie',
    gender: 'neutral',
    apple_id: 'apple-charlie-001',
    google_id: 'google-charlie-001',
  },
];

const stmt = db.prepare(`
  INSERT OR REPLACE INTO users (id, email, display_name, gender, apple_id, google_id, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const user of users) {
  stmt.run(user.id, user.email, user.display_name, user.gender, user.apple_id, user.google_id, now, now);
  console.log(`✓ Created user: ${user.email}`);
}

console.log(`\n✓ Seeded ${users.length} users to ${dbPath}`);

db.close();
