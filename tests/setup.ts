/**
 * Setup файл - выполняется перед тестами в том же процессе
 */
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { beforeAll, afterAll } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEST_DIR = join(__dirname, '../.test-data');
const TEST_DB = join(TEST_DIR, 'test.db');

// Устанавливаем env ДО импорта любых модулей приложения
process.env['DB_PATH'] = TEST_DB;
process.env['NODE_ENV'] = 'test';
process.env['JWT_SECRET'] = 'test-jwt-secret';
process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret';

beforeAll(() => {
  // Создаём директорию
  mkdirSync(TEST_DIR, { recursive: true });

  // Создаём базу через скрипт (Node 24 native TS)
  execSync(`node --experimental-transform-types scripts/setup-db.ts "${TEST_DB}"`, {
    cwd: join(__dirname, '..'),
    stdio: 'pipe',
  });
});

afterAll(() => {
  // Импортируем db только для закрытия
  import('../src/db/index.ts').then(({ closeDatabase }) => {
    closeDatabase();
  }).catch(() => {});

  // Чистим файлы
  if (existsSync(TEST_DB)) rmSync(TEST_DB, { force: true });
  if (existsSync(`${TEST_DB}-wal`)) rmSync(`${TEST_DB}-wal`, { force: true });
  if (existsSync(`${TEST_DB}-shm`)) rmSync(`${TEST_DB}-shm`, { force: true });
});
