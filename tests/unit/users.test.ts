import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { TEST_DB_PATH, TEST_DATA_DIR, cleanupTestDatabase } from '../setup.ts';

let testDb: Database.Database;

function createTestDatabase(): Database.Database {
  mkdirSync(TEST_DATA_DIR, { recursive: true });
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
  `);

  return db;
}

describe('Users Service', () => {
  beforeEach(() => {
    cleanupTestDatabase();
    testDb = createTestDatabase();
  });

  afterEach(() => {
    if (testDb) {
      testDb.close();
    }
    cleanupTestDatabase();
  });

  describe('createUser', () => {
    it('should create a user with required fields', () => {
      const stmt = testDb.prepare(`
        INSERT INTO users (id, email, display_name, gender)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run('test-id-1', 'test@example.com', 'Test User', 'female');

      const user = testDb.prepare('SELECT * FROM users WHERE id = ?').get('test-id-1') as Record<string, unknown>;

      expect(user).toBeDefined();
      expect(user['email']).toBe('test@example.com');
      expect(user['display_name']).toBe('Test User');
      expect(user['gender']).toBe('female');
    });

    it('should set default gender to female', () => {
      const stmt = testDb.prepare(`
        INSERT INTO users (id, email, display_name)
        VALUES (?, ?, ?)
      `);

      stmt.run('test-id-2', 'test2@example.com', 'Test User 2');

      const user = testDb.prepare('SELECT * FROM users WHERE id = ?').get('test-id-2') as Record<string, unknown>;

      expect(user['gender']).toBe('female');
    });

    it('should enforce unique email', () => {
      const stmt = testDb.prepare(`
        INSERT INTO users (id, email, display_name)
        VALUES (?, ?, ?)
      `);

      stmt.run('test-id-3', 'unique@example.com', 'Test User 3');

      expect(() => {
        stmt.run('test-id-4', 'unique@example.com', 'Test User 4');
      }).toThrow();
    });

    it('should allow null apple_id and google_id', () => {
      const stmt = testDb.prepare(`
        INSERT INTO users (id, email, display_name, apple_id, google_id)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run('test-id-5', 'test5@example.com', 'Test User 5', null, null);

      const user = testDb.prepare('SELECT * FROM users WHERE id = ?').get('test-id-5') as Record<string, unknown>;

      expect(user['apple_id']).toBeNull();
      expect(user['google_id']).toBeNull();
    });
  });

  describe('findUserByEmail', () => {
    it('should find user by email', () => {
      testDb.prepare(`
        INSERT INTO users (id, email, display_name)
        VALUES (?, ?, ?)
      `).run('find-test-1', 'findme@example.com', 'Find Me');

      const user = testDb.prepare('SELECT * FROM users WHERE email = ?').get('findme@example.com') as Record<string, unknown>;

      expect(user).toBeDefined();
      expect(user['id']).toBe('find-test-1');
    });

    it('should return undefined for non-existent email', () => {
      const user = testDb.prepare('SELECT * FROM users WHERE email = ?').get('nonexistent@example.com');
      expect(user).toBeUndefined();
    });
  });

  describe('findUserByAppleId', () => {
    it('should find user by apple_id', () => {
      testDb.prepare(`
        INSERT INTO users (id, email, display_name, apple_id)
        VALUES (?, ?, ?, ?)
      `).run('apple-test-1', 'apple@example.com', 'Apple User', 'apple-sub-123');

      const user = testDb.prepare('SELECT * FROM users WHERE apple_id = ?').get('apple-sub-123') as Record<string, unknown>;

      expect(user).toBeDefined();
      expect(user['id']).toBe('apple-test-1');
    });
  });

  describe('findUserByGoogleId', () => {
    it('should find user by google_id', () => {
      testDb.prepare(`
        INSERT INTO users (id, email, display_name, google_id)
        VALUES (?, ?, ?, ?)
      `).run('google-test-1', 'google@example.com', 'Google User', 'google-sub-456');

      const user = testDb.prepare('SELECT * FROM users WHERE google_id = ?').get('google-sub-456') as Record<string, unknown>;

      expect(user).toBeDefined();
      expect(user['id']).toBe('google-test-1');
    });
  });

  describe('updateUser', () => {
    it('should update display_name', () => {
      testDb.prepare(`
        INSERT INTO users (id, email, display_name)
        VALUES (?, ?, ?)
      `).run('update-test-1', 'update@example.com', 'Old Name');

      testDb.prepare(`
        UPDATE users SET display_name = ? WHERE id = ?
      `).run('New Name', 'update-test-1');

      const user = testDb.prepare('SELECT * FROM users WHERE id = ?').get('update-test-1') as Record<string, unknown>;

      expect(user['display_name']).toBe('New Name');
    });

    it('should update gender', () => {
      testDb.prepare(`
        INSERT INTO users (id, email, display_name, gender)
        VALUES (?, ?, ?, ?)
      `).run('gender-test-1', 'gender@example.com', 'Gender User', 'female');

      testDb.prepare(`
        UPDATE users SET gender = ? WHERE id = ?
      `).run('male', 'gender-test-1');

      const user = testDb.prepare('SELECT * FROM users WHERE id = ?').get('gender-test-1') as Record<string, unknown>;

      expect(user['gender']).toBe('male');
    });

    it('should update push_token and push_enabled', () => {
      testDb.prepare(`
        INSERT INTO users (id, email, display_name)
        VALUES (?, ?, ?)
      `).run('push-test-1', 'push@example.com', 'Push User');

      testDb.prepare(`
        UPDATE users SET push_token = ?, push_enabled = ? WHERE id = ?
      `).run('fcm-token-123', 1, 'push-test-1');

      const user = testDb.prepare('SELECT * FROM users WHERE id = ?').get('push-test-1') as Record<string, unknown>;

      expect(user['push_token']).toBe('fcm-token-123');
      expect(user['push_enabled']).toBe(1);
    });
  });

  describe('deleteUser', () => {
    it('should delete user', () => {
      testDb.prepare(`
        INSERT INTO users (id, email, display_name)
        VALUES (?, ?, ?)
      `).run('delete-test-1', 'delete@example.com', 'Delete Me');

      const result = testDb.prepare('DELETE FROM users WHERE id = ?').run('delete-test-1');

      expect(result.changes).toBe(1);

      const user = testDb.prepare('SELECT * FROM users WHERE id = ?').get('delete-test-1');
      expect(user).toBeUndefined();
    });

    it('should return 0 changes for non-existent user', () => {
      const result = testDb.prepare('DELETE FROM users WHERE id = ?').run('non-existent-id');
      expect(result.changes).toBe(0);
    });
  });

  describe('gender validation', () => {
    it('should accept valid genders', () => {
      const validGenders = ['female', 'male', 'neutral'];

      for (const gender of validGenders) {
        const id = `gender-valid-${gender}`;
        testDb.prepare(`
          INSERT INTO users (id, email, display_name, gender)
          VALUES (?, ?, ?, ?)
        `).run(id, `${gender}@example.com`, `${gender} User`, gender);

        const user = testDb.prepare('SELECT * FROM users WHERE id = ?').get(id) as Record<string, unknown>;
        expect(user['gender']).toBe(gender);
      }
    });

    it('should reject invalid gender', () => {
      expect(() => {
        testDb.prepare(`
          INSERT INTO users (id, email, display_name, gender)
          VALUES (?, ?, ?, ?)
        `).run('invalid-gender-1', 'invalid@example.com', 'Invalid User', 'invalid');
      }).toThrow();
    });
  });
});
