import { randomUUID } from 'node:crypto';
import { db } from '../db/index.ts';
import type { User, Gender } from '../types/index.ts';

interface CreateUserParams {
  email: string;
  display_name: string;
  gender?: Gender;
  apple_id?: string;
  google_id?: string;
  avatar_url?: string;
}

interface UpdateUserParams {
  display_name?: string;
  gender?: Gender;
  push_token?: string;
  push_enabled?: boolean;
}

export function findUserById(id: string): User | null {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id) as User | null;
}

export function findUserByEmail(email: string): User | null {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email) as User | null;
}

export function findUserByAppleId(appleId: string): User | null {
  const stmt = db.prepare('SELECT * FROM users WHERE apple_id = ?');
  return stmt.get(appleId) as User | null;
}

export function findUserByGoogleId(googleId: string): User | null {
  const stmt = db.prepare('SELECT * FROM users WHERE google_id = ?');
  return stmt.get(googleId) as User | null;
}

export function createUser(params: CreateUserParams): User {
  const id = randomUUID();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO users (id, email, display_name, gender, apple_id, google_id, avatar_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    params.email,
    params.display_name,
    params.gender || 'female',
    params.apple_id || null,
    params.google_id || null,
    params.avatar_url || null,
    now,
    now
  );

  return findUserById(id)!;
}

export function updateUser(id: string, params: UpdateUserParams): User | null {
  const updates: string[] = [];
  const values: unknown[] = [];

  if (params.display_name !== undefined) {
    updates.push('display_name = ?');
    values.push(params.display_name);
  }

  if (params.gender !== undefined) {
    updates.push('gender = ?');
    values.push(params.gender);
  }

  if (params.push_token !== undefined) {
    updates.push('push_token = ?');
    values.push(params.push_token);
  }

  if (params.push_enabled !== undefined) {
    updates.push('push_enabled = ?');
    values.push(params.push_enabled ? 1 : 0);
  }

  if (updates.length === 0) {
    return findUserById(id);
  }

  updates.push("updated_at = datetime('now')");
  values.push(id);

  const stmt = db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  return findUserById(id);
}

export function linkAppleId(userId: string, appleId: string): void {
  const stmt = db.prepare("UPDATE users SET apple_id = ?, updated_at = datetime('now') WHERE id = ?");
  stmt.run(appleId, userId);
}

export function linkGoogleId(userId: string, googleId: string): void {
  const stmt = db.prepare("UPDATE users SET google_id = ?, updated_at = datetime('now') WHERE id = ?");
  stmt.run(googleId, userId);
}

export function deleteUser(id: string): boolean {
  const stmt = db.prepare('DELETE FROM users WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}
