import { beforeAll, afterAll } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { rmSync, mkdirSync, existsSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const TEST_DATA_DIR = join(__dirname, '../.test-data');
export const TEST_DB_PATH = join(TEST_DATA_DIR, 'test.db');

// Set test environment
process.env['NODE_ENV'] = 'test';
process.env['DB_PATH'] = TEST_DB_PATH;
process.env['JWT_SECRET'] = 'test-jwt-secret';
process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret';

export function cleanupTestDatabase(): void {
  try {
    if (existsSync(TEST_DB_PATH)) rmSync(TEST_DB_PATH, { force: true });
    if (existsSync(`${TEST_DB_PATH}-wal`)) rmSync(`${TEST_DB_PATH}-wal`, { force: true });
    if (existsSync(`${TEST_DB_PATH}-shm`)) rmSync(`${TEST_DB_PATH}-shm`, { force: true });
  } catch {
    // Ignore errors
  }
}

beforeAll(() => {
  mkdirSync(TEST_DATA_DIR, { recursive: true });
  cleanupTestDatabase();
});

afterAll(() => {
  cleanupTestDatabase();
  try {
    rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  } catch {
    // Ignore
  }
});
